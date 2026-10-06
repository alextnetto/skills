// Prévia sem gastar crédito de voz: cria tempos falsos (16 letras por segundo) para as cenas ainda sem narração,
// roda o verificador de layout e gera folhas de contato para revisar o visual.
// "npm run narrar" substitui os tempos falsos pelos de verdade.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, scenes, ok, info } from './lib/comum.mjs';
import { falaDe } from './lib/fala.mjs';

const CPS = 16;
let n = 0;
for (const s of scenes) {
  const meta = path.join(P.audio, `${s.id}.json`);
  const text = falaDe(s);
  // mantém o que já existe (real ou de prévia) se a fala não mudou
  if (fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta)).text === text) continue;
  const starts = [...text].map((_, i) => i / CPS), ends = starts.map((t) => t + 1 / CPS);
  fs.writeFileSync(meta, JSON.stringify({ id: s.id, hash: 'fake', text, duration: text.length / CPS, starts, ends }));
  n++;
}
ok(`Tempos de prévia criados para ${n} cena(s).`);
const run = (tool, extra = []) => {
  try { execFileSync(process.execPath, [path.join('ferramentas', tool), ...extra], { stdio: 'inherit' }); return true; }
  catch { return false; }
};
const layoutOk = run('checar.mjs');
run('folhas.mjs', process.argv.slice(2));
info('Abra as imagens em trabalho/folhas/ para revisar. Prévia não tem som; a duração é estimada.');
process.exitCode = layoutOk ? 0 : 1;
