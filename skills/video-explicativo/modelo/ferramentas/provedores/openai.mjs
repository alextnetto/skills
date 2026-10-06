// OpenAI: boa voz, sotaque um pouco estrangeiro em português. Não informa o tempo das palavras (estimamos pelas pausas).
import fs from 'node:fs';
import { toWorkWav } from '../lib/audio.mjs';

const API = 'https://api.openai.com/v1';
const usd = (v) => `US$ ${Math.max(0.01, v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const VOZES = ['marin', 'cedar', 'coral', 'sage', 'ash', 'ballad', 'verse', 'alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];
const INSTRUCOES = 'Fale em português do Brasil, com sotaque brasileiro natural e neutro. Tom de professor que explica com calma, clareza e segurança, em ritmo de conversa.';

async function call(key, url, init = {}) {
  const res = await fetch(`${API}${url}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers || {}) } });
  if (!res.ok) {
    const body = await res.text();
    let msg = `OpenAI respondeu ${res.status}: ${body.slice(0, 300)}`;
    if (res.status === 401) msg = 'chave da OpenAI inválida (confira se copiou inteira, começando com "sk-")';
    if (/insufficient_quota|billing/.test(body)) msg = 'a conta da OpenAI está sem crédito. Adicione pelo menos US$ 5 em platform.openai.com/settings/organization/billing';
    const err = new Error(msg);
    err.status = res.status; err.retry = res.status >= 500 || (res.status === 429 && !/insufficient_quota/.test(body));
    throw err;
  }
  return res;
}

export default {
  id: 'openai',
  nome: 'OpenAI',
  chave: 'OPENAI_API_KEY',
  exato: false,
  paralelo: 3,
  vozPadrao: 'marin',
  modeloPadrao: 'gpt-4o-mini-tts',

  async sintetizar({ texto, voz, key, wav, tmp }) {
    const modelo = voz.modelo || this.modeloPadrao;
    const body = { model: modelo, voice: voz.id || this.vozPadrao, input: texto, response_format: 'wav' };
    if (!/^tts-1/.test(modelo)) body.instructions = voz.instrucoes || INSTRUCOES;
    if (voz.velocidade && voz.velocidade !== 1) body.speed = voz.velocidade;
    const res = await call(key, '/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    fs.writeFileSync(`${tmp}.wav`, Buffer.from(await res.arrayBuffer()));
    toWorkWav(`${tmp}.wav`, wav);
    fs.rmSync(`${tmp}.wav`, { force: true });
    return null;
  },

  async checar(key) {
    try { await call(key, '/models/gpt-4o-mini-tts'); return { ok: true, msg: 'chave válida (o saldo de créditos não aparece pela API; confira em platform.openai.com/usage)' }; }
    catch (e) { return { ok: false, msg: e.message }; }
  },

  async vozes() { return VOZES.map((v) => ({ id: v, nome: v, detalhe: v === 'marin' || v === 'cedar' ? 'recomendada pela OpenAI' : '' })); },

  async transcrever(key, arquivo) {
    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('language', 'pt');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    form.append('file', new Blob([fs.readFileSync(arquivo)]), 'narracao.mp3');
    const j = await (await call(key, '/audio/transcriptions', { method: 'POST', body: form })).json();
    return (j.words || []).map((w) => ({ text: w.word, start: w.start }));
  },

  custo(chars) {
    const min = chars / 900;
    return `cerca de ${usd(min * 0.015)} (estimativa; a conta precisa de crédito pré-pago)`;
  },
};
