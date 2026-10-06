// Folhas de contato: fotos de várias cenas em momentos diferentes, 16 por imagem, para revisar o vídeo de olho.
// Uso: npm run folhas [-- 0.3,0.7,0.97]   (frações da duração de cada cena)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, scenes } from './lib/comum.mjs';
import { ff } from './lib/audio.mjs';

const fr = (process.argv.slice(2).find((x) => /^[\d.,]+$/.test(x)) || '0.35,0.97').split(',').map(Number);
const dur = (s) => {
  const f = path.join(P.work, `${s.id}.info.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f)).duration;
  const a = JSON.parse(fs.readFileSync(path.join(P.audio, `${s.id}.json`)));
  return a.duration + s.lead + s.tail;
};
const spec = scenes.flatMap((s) => fr.map((f) => `${s.id}@${(dur(s) * f).toFixed(2)}`));
try {
  execFileSync(process.execPath, [path.join('ferramentas', 'renderizar.mjs'), '--quadro', spec.join(',')], { stdio: ['ignore', 'pipe', 'inherit'] });
} catch (e) {
  process.stdout.write(e.stdout || '');
  console.log('❌ Não consegui fotografar todas as cenas; corrija o erro acima e rode de novo.');
  process.exit(1);
}
const dir = path.join(P.work, 'folhas');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
for (let i = 0, n = 1; i < spec.length; i += 16, n++) {
  const g = spec.slice(i, i + 16);
  while (g.length < 16) g.push(g[g.length - 1]);
  const layout = g.map((_, k) => `${(k % 4) * 480}_${Math.floor(k / 4) * 270}`).join('|');
  const inputs = g.flatMap((x) => ['-i', path.join(P.work, 'quadros', `${x}.png`)]);
  const chain = g.map((_, k) => `[${k}]scale=480:270:flags=lanczos[s${k}]`).join(';') + ';' + g.map((_, k) => `[s${k}]`).join('') + `xstack=inputs=16:layout=${layout}`;
  const out = path.join(dir, `folha-${String(n).padStart(2, '0')}.png`);
  ff([...inputs, '-filter_complex', chain, '-frames:v', '1', out]);
  console.log(`${path.relative(process.cwd(), out)}  (${g[0]} … ${g[g.length - 1]})`);
}
