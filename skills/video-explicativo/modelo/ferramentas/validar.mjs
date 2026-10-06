// Confere o roteiro sem abrir o navegador: ids repetidos, cena sem fala, gatilho "@frase" que não existe na fala,
// tipos de item desconhecidos e imagens que não estão na pasta.
import fs from 'node:fs';
import path from 'node:path';
import { P, scenes, ok, bad, info, mmss, RITMO } from './lib/comum.mjs';
import { spoken, fold } from '../motor/marcacao.js';

const TYPES = ['text', 'rule', 'node', 'group', 'edge', 'emph', 'strike', 'list', 'table', 'code', 'big', 'meter', 'range', 'timeline',
  'hbars', 'bars', 'jbars', 'tower', 'tranches', 'image', 'doc'];
const errs = [];
const ids = new Set();
let words = 0;
for (const s of scenes) {
  if (!s.id || !/^[a-z0-9_-]+$/i.test(s.id)) errs.push(`cena sem id válido (use letras e números, ex.: c1s2): ${JSON.stringify(s).slice(0, 80)}`);
  if (ids.has(s.id)) errs.push(`${s.id}: id repetido`);
  ids.add(s.id);
  if (!s.fala || !s.fala.trim()) { errs.push(`${s.id}: cena sem fala (toda cena precisa de narração)`); continue; }
  if (/[{}]/.test(s.fala.replace(/\{[^{}|]*\|[^{}|]*\}/g, ''))) errs.push(`${s.id}: chave { } solta na fala; o formato é {escrito|falado}`);
  const hay = fold(spoken(s.fala));
  words += hay.split(/\s+/).filter(Boolean).length;
  const cues = [];
  const walk = (v, where) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
      if (['at', 'out', 'until', 'strikeAt', 'headAt', 'markAt', 'valueAt', 'overAt', 'fichaAt'].includes(k) && typeof x === 'string' && x.startsWith('@')) cues.push([x, `${where}.${k}`]);
      else walk(x, `${where}.${k}`);
    }
  };
  walk({ items: s.items, term: s.term, recap: s.recap, ficha: s.ficha, fichaAt: s.fichaAt }, s.id);
  for (const [cue, where] of cues) {
    const m = cue.match(/^@(.+?)(?:#(\d+))?(?:\+([\d.]+))?$/);
    if (!m) { errs.push(`${where}: gatilho mal escrito "${cue}"`); continue; }
    const phrase = fold(m[1]), nth = m[2] ? parseInt(m[2], 10) : 1;
    let idx = -1;
    for (let k = 0; k < nth; k++) { idx = hay.indexOf(phrase, idx + 1); if (idx < 0) break; }
    if (idx < 0) errs.push(`${where}: a frase "${m[1]}" não aparece na fala de ${s.id}${nth > 1 ? ` ${nth} vezes` : ''} (lembre que números e siglas devem estar como são falados)`);
  }
  for (const it of s.items) {
    if (!TYPES.includes(it.type)) errs.push(`${s.id}: tipo de item desconhecido "${it.type}"`);
    if (it.type === 'image' && !fs.existsSync(path.join(process.cwd(), String(it.src || '')))) errs.push(`${s.id}: imagem não encontrada: ${it.src}`);
  }
  if (s.layout === 'ficha' && !s.ficha) errs.push(`${s.id}: layout ficha sem lista ficha`);
}
if (errs.length) { errs.forEach((e) => bad(e)); process.exit(1); }
ok(`Roteiro válido: ${scenes.length} cenas, ${words} palavras faladas (vídeo de ${mmss((words / 150) * 60)} a ${mmss((words / 120) * 60)}, conforme a voz).`);
// com narração de verdade em todas as cenas, mostra a duração real
let real = 0;
for (const s of scenes) {
  const f = path.join(P.audio, `${s.id}.json`);
  const m = fs.existsSync(f) && JSON.parse(fs.readFileSync(f));
  if (!m || m.hash === 'fake') { real = null; break; }
  real += m.duration / RITMO + s.lead + s.tail;
}
if (real) info(`Com a narração atual: cerca de ${mmss(real)} (se a fala mudou, rode "npm run narrar").`);
