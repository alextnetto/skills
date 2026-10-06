// Contrato dos provedores com respostas simuladas no formato da documentação de cada API (sem rede, sem chave).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeWav, wavDuration } from '../ferramentas/lib/audio.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'provedores-'));
const tone = (sec, sr) => { const a = new Int16Array(Math.round(sec * sr)); for (let i = 0; i < a.length; i++) a[i] = Math.round(8000 * Math.sin(i / 8)); return a; };
const realFetch = globalThis.fetch;
const mock = (handler) => { globalThis.fetch = async (url, init) => handler(String(url), init); };
test.after(() => { globalThis.fetch = realFetch; fs.rmSync(tmp, { recursive: true, force: true }); });

test('Gemini: PCM cru de 24 kHz vira WAV de trabalho', async () => {
  const gemini = (await import('../ferramentas/provedores/gemini.mjs')).default;
  const pcm = tone(1.5, 24000);
  let body;
  mock(async (url, init) => {
    body = JSON.parse(init.body);
    assert.match(url, /models\/gemini-3\.8-flash-tts:generateContent$/);
    assert.equal(init.headers['x-goog-api-key'], 'k');
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.from(pcm.buffer).toString('base64') } }] } }] }));
  });
  const wav = path.join(tmp, 'g.wav');
  const r = await gemini.sintetizar({ texto: 'Olá.', voz: {}, key: 'k', wav, tmp: path.join(tmp, 'g') });
  assert.equal(r, null);
  assert.deepEqual(body.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Charon');
  assert.ok(Math.abs(wavDuration(wav) - 1.5) < 0.01);
});

test('Gemini: WAV com cabeçalho (modelos 3.8) é aceito como está', async () => {
  const gemini = (await import('../ferramentas/provedores/gemini.mjs')).default;
  const src = path.join(tmp, 'src.wav');
  writeWav(src, tone(0.8, 24000), 24000);
  mock(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: fs.readFileSync(src).toString('base64') } }] } }] })));
  const wav = path.join(tmp, 'g2.wav');
  await gemini.sintetizar({ texto: 'Olá.', voz: { id: 'Kore' }, key: 'k', wav, tmp: path.join(tmp, 'g2') });
  assert.ok(Math.abs(wavDuration(wav) - 0.8) < 0.01);
});

test('Gemini: limite diário para tudo; limite por minuto tenta de novo', async () => {
  const gemini = (await import('../ferramentas/provedores/gemini.mjs')).default;
  mock(async () => new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } }), { status: 429 }));
  await assert.rejects(gemini.sintetizar({ texto: 'a', voz: {}, key: 'k', wav: path.join(tmp, 'x.wav'), tmp: path.join(tmp, 'x') }), (e) => e.fatal === true && /diário/.test(e.message));
  mock(async () => new Response(JSON.stringify({ error: { code: 429, details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7s' }] } }), { status: 429 }));
  await assert.rejects(gemini.sintetizar({ texto: 'a', voz: {}, key: 'k', wav: path.join(tmp, 'x.wav'), tmp: path.join(tmp, 'x') }), (e) => e.retry === true && !e.fatal && e.wait === 9000);
});

test('Gemini: modelo padrão inexistente cai no modelo reserva', async () => {
  const gemini = (await import('../ferramentas/provedores/gemini.mjs')).default;
  const urls = [];
  mock(async (url) => {
    urls.push(url);
    if (/3\.8/.test(url)) return new Response('{"error":{"code":404,"message":"not found"}}', { status: 404 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: Buffer.from(tone(0.5, 24000).buffer).toString('base64') } }] } }] }));
  });
  await gemini.sintetizar({ texto: 'a', voz: {}, key: 'k', wav: path.join(tmp, 'g3.wav'), tmp: path.join(tmp, 'g3') });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /gemini-2\.5-flash-preview-tts/);
});

test('OpenAI: pede WAV com instrução de sotaque e converte', async () => {
  const openai = (await import('../ferramentas/provedores/openai.mjs')).default;
  const src = path.join(tmp, 'o.wav');
  writeWav(src, tone(1.2, 24000), 24000);
  let body;
  mock(async (url, init) => {
    body = JSON.parse(init.body);
    assert.match(url, /\/v1\/audio\/speech$/);
    assert.equal(init.headers.Authorization, 'Bearer k');
    return new Response(fs.readFileSync(src));
  });
  const wav = path.join(tmp, 'o2.wav');
  await openai.sintetizar({ texto: 'Olá.', voz: {}, key: 'k', wav, tmp: path.join(tmp, 'o2') });
  assert.equal(body.model, 'gpt-4o-mini-tts');
  assert.equal(body.voice, 'marin');
  assert.equal(body.response_format, 'wav');
  assert.match(body.instructions, /português do Brasil/);
  assert.ok(Math.abs(wavDuration(wav) - 1.2) < 0.01);
});

test('OpenAI: conta sem crédito dá mensagem clara e não tenta de novo', async () => {
  const openai = (await import('../ferramentas/provedores/openai.mjs')).default;
  mock(async () => new Response('{"error":{"code":"insufficient_quota","message":"You exceeded your current quota"}}', { status: 429 }));
  await assert.rejects(openai.sintetizar({ texto: 'a', voz: {}, key: 'k', wav: path.join(tmp, 'y.wav'), tmp: path.join(tmp, 'y') }), (e) => e.retry === false && /crédito/.test(e.message));
});

test('ElevenLabs: devolve o alinhamento exato e rejeita alinhamento que não bate', async () => {
  const el = (await import('../ferramentas/provedores/elevenlabs.mjs')).default;
  const mp3 = fs.readFileSync('testes/fixtures/c1s1.mp3').toString('base64');
  const texto = 'Olá.';
  let body;
  mock(async (url, init) => {
    body = JSON.parse(init.body);
    assert.match(url, /\/with-timestamps\?output_format=mp3_44100_128$/);
    return new Response(JSON.stringify({ audio_base64: mp3, alignment: { characters: [...texto], character_start_times_seconds: [0, 0.1, 0.2, 0.3], character_end_times_seconds: [0.1, 0.2, 0.3, 0.4] } }));
  });
  const r = await el.sintetizar({ texto, voz: { id: 'v' }, key: 'k', wav: path.join(tmp, 'e.wav'), tmp: path.join(tmp, 'e.mp3') });
  assert.deepEqual(r.starts, [0, 0.1, 0.2, 0.3]);
  assert.equal(body.model_id, 'eleven_multilingual_v2');
  assert.equal(body.language_code, 'pt');
  await assert.rejects(el.sintetizar({ texto: 'Outro texto', voz: { id: 'v' }, key: 'k', wav: path.join(tmp, 'e2.wav'), tmp: path.join(tmp, 'e2.mp3') }), /não bate/);
  // v4: sem emenda com o texto vizinho e sem velocidade
  await el.sintetizar({ texto, anterior: 'antes', voz: { id: 'v', modelo: 'eleven_v4', velocidade: 1.1 }, key: 'k', wav: path.join(tmp, 'e3.wav'), tmp: path.join(tmp, 'e3.mp3') });
  assert.equal(body.previous_text, undefined);
  assert.equal(body.voice_settings.speed, undefined);
});
