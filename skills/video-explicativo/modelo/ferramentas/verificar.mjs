// Confere se o computador está pronto para fazer vídeos e diz exatamente o que falta.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { config, getKey, keySource, KEYS_FILE, ok, bad, warn, info } from './lib/comum.mjs';
import { provedor, PROVEDORES } from './provedores/index.mjs';

const COMO = {
  elevenlabs: [
    'Melhor voz em português. Plano Starter: US$ 6/mês (o primeiro mês costuma sair por US$ 1). Contas grátis novas não usam vozes pela API.',
    'Crie a chave em https://elevenlabs.io/app/settings/api-keys > Create API Key.',
    'Deixe "Restrict Key" ligado e dê acesso a: Text to Speech, Speech to Text, Voices (Read) e User (Read).',
  ],
  gemini: [
    'Grátis, sem cartão, com limite de pedidos por dia. Voz boa; sotaque às vezes oscila.',
    'Crie a chave em https://aistudio.google.com/apikey > Create API key (entre com sua conta Google).',
  ],
  openai: [
    'Voz boa, com leve sotaque estrangeiro. Precisa de pelo menos US$ 5 de crédito pré-pago.',
    'Crie a chave em https://platform.openai.com/api-keys > Create new secret key; adicione crédito em Settings > Billing.',
  ],
  local: ['Voz do próprio computador: grátis e sem cadastro, mas robótica. Boa para rascunho.'],
};

let pending = 0;
const fail = (msg, ...how) => { bad(msg); how.forEach((h) => info(h)); pending++; };

// 1. Node
const major = parseInt(process.versions.node.split('.')[0], 10);
if (major >= 18) ok(`Node ${process.versions.node}`);
else fail(`Node ${process.versions.node} é antigo demais`, 'Instale a versão LTS em https://nodejs.org e abra uma nova sessão.');

// 2. pacotes
const hasPw = fs.existsSync('node_modules/playwright'), hasFonts = fs.existsSync('node_modules/@fontsource/crimson-text');
if (hasPw && hasFonts) ok('Pacotes instalados');
else fail('Pacotes não instalados', 'Rode: npm install   (baixa o ffmpeg e o navegador; leva alguns minutos na primeira vez)');

// 3. ffmpeg
try {
  const { ffmpegPath } = await import('./lib/audio.mjs');
  const bin = ffmpegPath();
  const enc = spawnSync(bin, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '';
  if (/libx264/.test(enc)) ok(`ffmpeg (${bin === 'ffmpeg' ? 'do sistema' : 'do pacote ffmpeg-static'})`);
  else fail('o ffmpeg encontrado não tem o codificador H.264 (libx264)', 'Rode: npm install ffmpeg-static');
} catch (e) { fail(e.message); }

// 4. navegador que desenha os quadros
if (hasPw) {
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    await b.close();
    ok('Navegador para desenhar os quadros');
  } catch {
    fail('Falta o navegador que desenha os quadros', 'Rode: npx playwright install --only-shell chromium');
  }
}

// 5. voz
const atual = config.voz?.provedor || 'elevenlabs';
const prov = await provedor(atual);
console.log(`\nVoz escolhida em video.config.js: ${prov.nome} (${atual})`);
if (!prov.chave) {
  const c = await prov.checar();
  c.ok ? ok(c.msg) : fail(c.msg);
} else {
  const key = getKey(prov.chave);
  if (!key) {
    fail(`Falta a chave ${prov.chave}`, ...COMO[atual], `Depois, guarde a chave no arquivo ${KEYS_FILE}, numa linha assim:`, `${prov.chave}=cole_a_chave_aqui`);
  } else {
    const c = await prov.checar(key);
    c.ok ? ok(`${prov.chave} (de ${keySource(prov.chave)}): ${c.msg}`) : fail(`${prov.chave}: ${c.msg}`);
  }
}
const others = PROVEDORES.filter((p) => p !== atual);
const avail = [];
for (const id of others) { const p = await provedor(id); if (!p.chave || getKey(p.chave)) avail.push(p.nome); }
if (avail.length) info(`Também disponíveis neste computador: ${avail.join(', ')}.`);

console.log('');
if (pending) { bad(`${pending} item(ns) pendente(s). Resolva na ordem acima e rode "npm run verificar" de novo.`); process.exitCode = 1; }
else ok('Tudo pronto para fazer vídeos.');
