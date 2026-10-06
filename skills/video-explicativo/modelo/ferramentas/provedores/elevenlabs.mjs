// ElevenLabs: melhor voz em português e devolve o tempo de cada letra (alinhamento exato).
import fs from 'node:fs';
import { toWorkWav } from '../lib/audio.mjs';

const API = 'https://api.elevenlabs.io/v1';

async function call(key, url, init = {}) {
  const res = await fetch(`${API}${url}`, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) } });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(explain(res.status, body));
    err.status = res.status; err.retry = res.status === 429 || res.status >= 500;
    throw err;
  }
  return res;
}

function explain(status, body) {
  const b = body.slice(0, 400);
  if (status === 401 && /missing_permissions/.test(b)) return `a chave não tem a permissão necessária (${b.match(/permission[^"]*"?[^"]*/)?.[0] || 'veja o detalhe'}). Edite a chave no site do ElevenLabs e ligue a permissão.`;
  if (status === 401) return 'chave do ElevenLabs inválida (confira se copiou inteira, começando com "sk_")';
  if (status === 402 || /quota_exceeded|insufficient/.test(b)) return 'créditos do ElevenLabs acabaram neste mês (veja elevenlabs.io/app/subscription)';
  if (status === 429) return 'muitas chamadas ao mesmo tempo no ElevenLabs; tentando de novo';
  if (/voice_not_found|paid_plan_required|library/i.test(b)) return `a voz escolhida não está disponível nesta conta (${b})`;
  return `ElevenLabs respondeu ${status}: ${b}`;
}

export default {
  id: 'elevenlabs',
  nome: 'ElevenLabs',
  chave: 'ELEVENLABS_API_KEY',
  exato: true,
  paralelo: 2,
  vozPadrao: 'JBFqnCBsd6RMkjVDRZzb', // George (voz padrão disponível em todas as contas)
  modeloPadrao: 'eleven_multilingual_v2',

  // v4 não aceita estilo nem velocidade; v3 e v4 não aceitam emendar com o texto vizinho.
  ajustes(voz) {
    const modelo = voz.modelo || this.modeloPadrao;
    const base = { stability: voz.estabilidade ?? 0.5, similarity_boost: 0.75 };
    if (/v4/.test(modelo)) return base;
    return { ...base, style: 0, use_speaker_boost: true, speed: voz.velocidade ?? 1.0 };
  },

  async sintetizar({ texto, anterior, proximo, voz, key, wav, tmp }) {
    const modelo = voz.modelo || this.modeloPadrao;
    const v3 = /v3/.test(modelo), v4 = /v4/.test(modelo);
    const body = {
      text: texto, model_id: modelo, voice_settings: this.ajustes(voz),
      ...(v3 ? {} : { language_code: 'pt' }),
      ...(v3 || v4 ? {} : { seed: 417, previous_text: anterior || undefined, next_text: proximo || undefined }),
    };
    const res = await call(key, `/text-to-speech/${voz.id || this.vozPadrao}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await res.json();
    const a = j.alignment;
    if (!a || a.characters.join('') !== texto) throw new Error('o ElevenLabs devolveu um alinhamento que não bate com o texto');
    fs.writeFileSync(tmp, Buffer.from(j.audio_base64, 'base64'));
    toWorkWav(tmp, wav);
    fs.rmSync(tmp, { force: true });
    return { starts: a.character_start_times_seconds, ends: a.character_end_times_seconds };
  },

  // Sem voz definida no video.config.js: usa uma voz brasileira da conta, se houver.
  async resolverVoz(key) {
    let voices;
    try { voices = (await (await call(key, '/voices?show_legacy=false')).json()).voices; }
    catch { return { id: this.vozPadrao, aviso: 'não consegui listar as vozes da conta (a chave precisa da permissão Voices: Read); usando a voz padrão George, que só existe em contas antigas' }; }
    const br = (v) => (v.verified_languages || []).some((l) => l.language === 'pt' && /brazil|br/i.test(`${l.accent} ${l.locale}`))
      || /brazil|brasil/i.test(`${v.labels?.accent} ${v.labels?.language} ${v.name} ${v.description}`);
    const pt = (v) => (v.verified_languages || []).some((l) => l.language === 'pt') || /portug/i.test(`${v.labels?.language} ${v.labels?.accent}`);
    const pick = voices.find(br) || voices.find(pt) || voices.find((v) => v.category !== 'premade') || voices[0];
    if (!pick) return { id: this.vozPadrao, aviso: 'a conta não tem nenhuma voz; adicione uma voz brasileira na Voice Library (veja referencia/vozes.md)' };
    return { id: pick.voice_id, nome: pick.name, aviso: br(pick) ? null : `nenhuma voz brasileira na conta; usando "${pick.name}". Para sotaque brasileiro, adicione uma voz da Voice Library (filtro Portuguese, sotaque Brazilian)` };
  },

  // Confere a chave. Créditos só aparecem se a chave tiver a permissão de leitura do usuário.
  async checar(key) {
    try {
      const r = await call(key, '/user/subscription');
      const s = await r.json();
      const left = s.character_limit - s.character_count;
      return { ok: true, msg: `chave válida, plano "${s.tier}", ${left.toLocaleString('pt-BR')} créditos restantes neste ciclo`, creditos: left };
    } catch (e) {
      if (e.status !== 401 || !/permiss/.test(e.message)) return { ok: false, msg: e.message };
    }
    try {
      await call(key, '/models');
      return { ok: true, msg: 'chave válida (sem permissão para ler o saldo de créditos, o que não impede de narrar)' };
    } catch (e) {
      // chave restrita só a texto para fala: valida com uma síntese mínima seria gastar crédito; aceita
      if (e.status === 401 && /permiss/.test(e.message)) return { ok: true, msg: 'chave aceita (restrita; não dá para ler o saldo)' };
      return { ok: false, msg: e.message };
    }
  },

  async vozes(key) {
    const r = await call(key, '/voices?show_legacy=false');
    const j = await r.json();
    return j.voices.map((v) => ({
      id: v.voice_id, nome: v.name,
      detalhe: [v.category, v.labels?.gender, v.labels?.accent, v.labels?.age].filter(Boolean).join(', '),
    }));
  },

  async transcrever(key, arquivo) {
    const form = new FormData();
    form.append('model_id', 'scribe_v2');
    form.append('language_code', 'por');
    form.append('file', new Blob([fs.readFileSync(arquivo)]), 'narracao.mp3');
    const r = await call(key, '/speech-to-text', { method: 'POST', body: form });
    const j = await r.json();
    return j.words.filter((w) => w.type === 'word').map((w) => ({ text: w.text, start: w.start }));
  },

  custo(chars, voz = {}) {
    const fator = /flash|turbo/.test(voz.modelo || '') ? 0.5 : 1;
    return `${Math.round(chars * fator).toLocaleString('pt-BR')} créditos (o plano Starter traz 30.000 por mês)`;
  },
};
