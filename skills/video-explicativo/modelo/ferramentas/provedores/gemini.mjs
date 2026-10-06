// Google Gemini: chave grátis no Google AI Studio (sem cartão), com limite diário de pedidos.
// Não informa o tempo das palavras (estimamos pelas pausas).
import fs from 'node:fs';
import { toWorkWav, writeWav } from '../lib/audio.mjs';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const usd = (v) => `US$ ${Math.max(0.01, v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const RESERVA = ['gemini-2.5-flash-preview-tts']; // se o modelo padrão não existir para a chave
const VOZES = {
  Charon: 'informativa (masc.)', Kore: 'firme (fem.)', Iapetus: 'clara (masc.)', Sadaltager: 'conhecedora (masc.)',
  Rasalgethi: 'informativa (masc.)', Schedar: 'equilibrada (masc.)', Achird: 'amigável (masc.)', Aoede: 'leve (fem.)',
  Leda: 'jovem (fem.)', Despina: 'suave (fem.)', Erinome: 'clara (fem.)', Gacrux: 'madura (fem.)', Sulafat: 'calorosa (fem.)',
  Zephyr: 'brilhante (fem.)', Puck: 'animada (masc.)', Orus: 'firme (masc.)', Fenrir: 'empolgada (masc.)', Algieba: 'macia (masc.)',
  Alnilam: 'firme (masc.)', Umbriel: 'tranquila (masc.)', Enceladus: 'sussurrada (masc.)', Callirrhoe: 'tranquila (fem.)',
  Autonoe: 'brilhante (fem.)', Algenib: 'rouca (masc.)', Laomedeia: 'animada (fem.)', Achernar: 'suave (fem.)',
  Pulcherrima: 'direta (fem.)', Zubenelgenubi: 'casual (masc.)', Vindemiatrix: 'gentil (fem.)', Sadachbia: 'viva (masc.)',
};

async function call(key, url, init = {}) {
  const res = await fetch(`${API}${url}`, { ...init, headers: { 'x-goog-api-key': key, ...(init.headers || {}) } });
  if (!res.ok) {
    const body = await res.text();
    let msg = `Gemini respondeu ${res.status}: ${body.slice(0, 300)}`;
    const err = new Error(msg);
    err.status = res.status;
    if (res.status === 400 && /API_KEY_INVALID|API key not valid/.test(body)) err.message = 'chave do Gemini inválida (confira se copiou inteira, começando com "AIza")';
    if (res.status === 403) err.message = 'a chave do Gemini não tem acesso a este modelo (confira em aistudio.google.com/apikey)';
    if (res.status === 404) err.message = `modelo não encontrado: ${body.slice(0, 200)}`;
    if (res.status === 429) {
      const daily = /PerDay|per day|daily/i.test(body);
      err.message = daily
        ? 'acabou o limite diário grátis do Gemini. Rode de novo amanhã (as cenas prontas ficam guardadas) ou ative o faturamento no AI Studio'
        : 'limite por minuto do Gemini; esperando para tentar de novo';
      err.retry = !daily; err.fatal = daily;
      const delay = body.match(/"retryDelay":\s*"(\d+)s"/);
      err.wait = delay ? (parseInt(delay[1], 10) + 2) * 1000 : 20000;
    } else err.retry = res.status >= 500;
    throw err;
  }
  return res;
}

export default {
  id: 'gemini',
  nome: 'Google Gemini',
  chave: 'GEMINI_API_KEY',
  exato: false,
  paralelo: 1,
  vozPadrao: 'Charon',
  modeloPadrao: 'gemini-3.8-flash-tts',

  async sintetizar({ texto, voz, key, wav, tmp }) {
    const modelos = [voz.modelo || this.modeloPadrao, ...(voz.modelo ? [] : RESERVA)];
    let res, lastErr;
    for (const modelo of modelos) {
      try {
        res = await call(key, `/models/${modelo}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: texto }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { languageCode: 'pt-BR', voiceConfig: { prebuiltVoiceConfig: { voiceName: voz.id || this.vozPadrao } } },
            },
          }),
        });
        break;
      } catch (e) { lastErr = e; if (e.status !== 404) throw e; }
    }
    if (!res) throw lastErr;
    const j = await res.json();
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw Object.assign(new Error(`o Gemini não devolveu áudio (${JSON.stringify(j).slice(0, 200)})`), { retry: true });
    const data = Buffer.from(part.inlineData.data, 'base64');
    if (data.toString('ascii', 0, 4) === 'RIFF') fs.writeFileSync(`${tmp}.bruto.wav`, data);
    else writeWav(`${tmp}.bruto.wav`, data, parseInt(part.inlineData.mimeType.match(/rate=(\d+)/)?.[1] || '24000', 10));
    toWorkWav(`${tmp}.bruto.wav`, wav);
    fs.rmSync(`${tmp}.bruto.wav`, { force: true });
    return null;
  },

  async checar(key) {
    try {
      const r = await call(key, '/models?pageSize=200');
      const names = (await r.json()).models?.map((m) => m.name.replace('models/', '')) || [];
      const tts = names.filter((n) => /tts/.test(n));
      if (!tts.length) return { ok: false, msg: 'a chave funciona, mas nenhum modelo de voz (tts) aparece para ela' };
      const has = tts.includes(this.modeloPadrao);
      return { ok: true, msg: `chave válida; modelos de voz: ${tts.join(', ')}${has ? '' : ` (o padrão ${this.modeloPadrao} não aparece; use voz.modelo com um destes)`}` };
    } catch (e) { return { ok: false, msg: e.message }; }
  },

  async vozes() { return Object.entries(VOZES).map(([id, d]) => ({ id, nome: id, detalhe: d })); },

  async transcrever(key, arquivo) {
    const data = fs.readFileSync(arquivo).toString('base64');
    const r = await call(key, '/models/gemini-flash-latest:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: 'audio/mp3', data } }, { text: 'Transcreva este áudio em português exatamente como foi falado, palavra por palavra, sem comentários nem formatação.' }] }] }),
    });
    const text = (await r.json()).candidates?.[0]?.content?.parts?.map((p) => p.text || '').join(' ') || '';
    return text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, start: null }));
  },

  custo(chars) {
    return `grátis dentro do limite diário (no plano pago, cerca de ${usd((chars / 900) * 0.0135)})`;
  },
};
