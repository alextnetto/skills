// Desenha cada cena quadro a quadro e grava trabalho/<id>.mp4. Só refaz cenas que mudaram.
// Uso: npm run renderizar [-- --cenas c1s1,c2s3] [-- --tudo]
//      npm run renderizar -- --quadro c2s3@8.5,c2s3@fim,todas@meio   (fotos PNG em trabalho/quadros/)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { P, scenes, config, RITMO, args, ok, bad } from './lib/comum.mjs';
import { abrirPalco, carregar } from './lib/palco.mjs';
import { ffmpegPath } from './lib/audio.mjs';
import { FPS } from '../motor/constantes.js';

const a = args();
const force = a.has('--tudo');
const workers = parseInt(a.get('--paralelo') || String(Math.max(1, Math.min(5, Math.floor(os.cpus().length / 2)))), 10);
const Q = path.join(P.work, 'quadros');
fs.mkdirSync(Q, { recursive: true });

const srcHash = crypto.createHash('sha1');
for (const f of fs.readdirSync('motor')) srcHash.update(fs.readFileSync(path.join('motor', f)));
srcHash.update(JSON.stringify(config));
const SRC = srcHash.digest('hex');
const allFicha = JSON.stringify(scenes.map((s) => s.ficha));
const audioOf = (s) => { const f = path.join(P.audio, `${s.id}.json`); return fs.existsSync(f) ? fs.readFileSync(f) : ''; };
const sceneHash = (s) => {
  const neigh = [scenes[s.index - 1], scenes[s.index + 1]].map((n) => (n ? [n.layout, n.continues, n.title, n.kicker] : null));
  const media = (s.items || []).filter((it) => it.src).map((it) => { try { return fs.statSync(path.join(process.cwd(), it.src)).mtimeMs; } catch { return 0; } });
  return crypto.createHash('sha1').update(SRC + JSON.stringify(s) + JSON.stringify(neigh) + allFicha + audioOf(s) + JSON.stringify(media)).digest('hex').slice(0, 16);
};

const palco = await abrirPalco();
try {
  if (a.get('--quadro')) {
    const page = await palco.open();
    const spec = a.get('--quadro');
    const parts = spec.split(',').flatMap((p) => (p.startsWith('todas@') ? scenes.map((s) => `${s.id}@${p.slice(6)}`) : [p]));
    for (const part of parts) {
      const [id, when = 'fim'] = part.split('@');
      let info;
      try { info = await carregar(page, id); } catch (e) { bad(`${id}: ${e.message}`); process.exitCode = 1; continue; }
      const t = when === 'fim' ? info.duration - 0.35 : when === 'meio' ? info.duration / 2 : parseFloat(when);
      await page.evaluate((x) => window.seek(x), t);
      const file = path.join(Q, `${id}@${when}.png`);
      await page.screenshot({ path: file, type: 'png' });
      console.log(path.relative(process.cwd(), file));
    }
  } else {
    const want = a.get('--cenas')?.split(',');
    const todo = scenes.filter((s) => !want || want.includes(s.id)).filter((s) => {
      if (force) return true;
      const meta = path.join(P.work, `${s.id}.info.json`);
      return !(fs.existsSync(meta) && fs.existsSync(path.join(P.work, `${s.id}.mp4`)) && JSON.parse(fs.readFileSync(meta)).hash === sceneHash(s));
    });
    const fake = scenes.filter((s) => { const f = path.join(P.audio, `${s.id}.json`); return !fs.existsSync(f) || JSON.parse(fs.readFileSync(f)).hash === 'fake'; });
    if (fake.length) console.log(`aviso: ${fake.length} cena(s) ainda sem narração de verdade (${fake.slice(0, 5).map((s) => s.id).join(', ')}${fake.length > 5 ? '…' : ''}); o vídeo final pede "npm run narrar" antes.`);
    console.log(`cenas para desenhar: ${todo.length} de ${scenes.length}`);
    const t0 = Date.now();
    let cursor = 0, failed = 0;
    await Promise.all(Array.from({ length: Math.min(workers, todo.length) }, async () => {
      const page = await palco.open();
      while (cursor < todo.length) {
        const s = todo[cursor++];
        try {
          const info = await carregar(page, s.id);
          const out = path.join(P.work, `${s.id}.mp4`);
          const ff = spawn(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
            '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
            '-r', String(FPS), '-g', String(FPS * 2), '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out],
          { stdio: ['pipe', 'inherit', 'inherit'] });
          const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg terminou com código ${c}`)))));
          let lastSig = null, buf = null;
          for (let f = 0; f < info.frames; f++) {
            const sig = await page.evaluate((x) => window.seek(x), f / FPS);
            if (sig !== lastSig) { buf = await page.screenshot({ type: 'png' }); lastSig = sig; }
            if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
          }
          ff.stdin.end();
          await done;
          fs.writeFileSync(path.join(P.work, `${s.id}.info.json`), JSON.stringify({ ...info, hash: sceneHash(s), ritmo: RITMO }));
          console.log(`  ${s.id}  ${info.duration.toFixed(1)} s`);
        } catch (e) { failed++; bad(`${s.id}: ${e.message}`); }
      }
    }));
    if (failed) { bad(`${failed} cena(s) falharam.`); process.exitCode = 1; }
    else ok(`Cenas desenhadas em ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  }
} finally {
  await palco.close();
}
