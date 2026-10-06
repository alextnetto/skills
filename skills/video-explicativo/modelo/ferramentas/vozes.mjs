// Lista as vozes do provedor e gera amostras para ouvir.
// Uso: npm run vozes                       lista as vozes do provedor configurado
//      npm run vozes -- --provedor gemini  lista as de outro provedor
//      npm run vozes -- --amostra Kore,Charon   grava amostras em amostras/ e abre a primeira
import fs from 'node:fs';
import path from 'node:path';
import { config, getKey, args, ok, bad, info, openFile } from './lib/comum.mjs';
import { provedor } from './provedores/index.mjs';

const a = args();
const id = a.get('--provedor') || config.voz?.provedor || 'elevenlabs';
const prov = await provedor(id);
const key = prov.chave ? getKey(prov.chave) : null;
if (prov.chave && !key) { bad(`Falta a chave ${prov.chave}. Rode "npm run verificar".`); process.exit(1); }

if (a.get('--amostra')) {
  const dir = path.join(process.cwd(), 'amostras');
  fs.mkdirSync(dir, { recursive: true });
  const frase = 'Olá! Esta é uma amostra da voz que vai narrar o seu vídeo. Dá para ouvir bem as pausas, os números, como mil novecentos e oitenta e quatro, e as siglas, como Pix e INSS.';
  let first = null;
  for (const v of a.get('--amostra').split(',')) {
    const wav = path.join(dir, `${id}-${v.replace(/[^\w-]/g, '_')}.wav`);
    try {
      await prov.sintetizar({ texto: frase, voz: { ...(id === config.voz?.provedor ? config.voz : {}), id: v }, key, wav, tmp: path.join(dir, `.tmp-${Date.now()}`) });
      ok(path.relative(process.cwd(), wav));
      first ??= wav;
    } catch (e) { bad(`${v}: ${e.message}`); }
  }
  if (first && !a.has('--sem-abrir')) openFile(first);
} else {
  try {
    const vs = await prov.vozes(key);
    ok(`${prov.nome}: ${vs.length} ${vs.length === 1 ? 'voz' : 'vozes'}${prov.vozPadrao ? ` (padrão: ${prov.vozPadrao})` : ''}`);
    for (const v of vs) info(`${v.id.padEnd(24)} ${v.nome !== v.id ? v.nome + ' · ' : ''}${v.detalhe || ''}`);
  } catch (e) { bad(e.message); process.exit(1); }
}
