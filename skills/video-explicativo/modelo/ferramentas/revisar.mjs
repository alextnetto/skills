// Revisão final: formato do arquivo, sincronia entre som e imagem e, se o provedor transcreve,
// compara o que a voz falou com o roteiro (pega sigla lida errado, número trocado, palavra engolida).
// Uso: npm run revisar [-- --sem-transcricao]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { P, config, getKey, SLUG, args, ok, bad, warn, info, mmss } from './lib/comum.mjs';
import { ffmpegPath, ff } from './lib/audio.mjs';
import { provedor, PROVEDORES } from './provedores/index.mjs';

const OUT = path.join(P.out, `${SLUG}.mp4`);
if (!fs.existsSync(OUT)) { bad('Ainda não há vídeo em saida/. Rode "npm run montar".'); process.exit(1); }

// 1. formato
const probe = spawnSync(ffmpegPath(), ['-hide_banner', '-i', OUT], { encoding: 'utf8' }).stderr;
const dur = (re) => { const m = probe.match(re); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null; };
const total = dur(/Duration: (\d+):(\d+):([\d.]+)/);
const video = probe.match(/Video: (\w+).*?, (\d+)x(\d+).*?, ([\d.]+) fps/);
const audio = probe.match(/Audio: (\w+).*?, (\d+) Hz/);
if (video && video[1] === 'h264' && video[2] === '1920' && video[3] === '1080' && Math.abs(parseFloat(video[4]) - 30) < 0.01) ok(`Vídeo H.264 1920x1080, 30 quadros por segundo, ${mmss(total)}`);
else bad(`Formato de vídeo inesperado: ${video ? video[0] : 'sem trilha de vídeo'}`);
if (audio && audio[1] === 'aac') ok(`Áudio AAC ${audio[2]} Hz`); else bad('Áudio ausente ou em formato inesperado');
const a = spawnSync(ffmpegPath(), ['-hide_banner', '-i', OUT, '-map', '0:a', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const v = spawnSync(ffmpegPath(), ['-hide_banner', '-i', OUT, '-map', '0:v', '-c', 'copy', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const last = (s) => { const all = [...s.matchAll(/time=(\d+):(\d+):([\d.]+)/g)]; const m = all[all.length - 1]; return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null; };
const da = last(a), dv = last(v);
if (da != null && dv != null) Math.abs(da - dv) < 0.1 ? ok(`Som e imagem com a mesma duração (diferença ${Math.round(Math.abs(da - dv) * 1000)} ms)`) : bad(`Som e imagem com durações diferentes: ${da.toFixed(2)} s x ${dv.toFixed(2)} s`);

if (args().has('--sem-transcricao')) process.exit(0);

// 2. transcrição: usa o provedor configurado ou qualquer outro com chave que saiba transcrever
const order = [config.voz?.provedor, ...PROVEDORES].filter((x, i, arr) => x && arr.indexOf(x) === i);
let words = null, by = null;
const mp3 = path.join(P.work, 'revisao.mp3');
for (const id of order) {
  const p = await provedor(id);
  if (!p.transcrever || !getKey(p.chave)) continue;
  try {
    if (!fs.existsSync(mp3) || fs.statSync(mp3).mtimeMs < fs.statSync(OUT).mtimeMs) ff(['-i', OUT, '-vn', '-ac', '1', '-b:a', '64k', mp3]);
    words = await p.transcrever(getKey(p.chave), mp3);
    by = p.nome;
    break;
  } catch (e) { warn(`Transcrição com ${p.nome} falhou: ${e.message}`); }
}
if (!words) { info('Sem transcrição automática (nenhuma chave com transcrição). Assista ao vídeo para conferir a pronúncia.'); process.exit(0); }

const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const script = JSON.parse(fs.readFileSync(path.join(P.work, 'script.json')));
const want = script.flatMap((s) => s.display.split(/\s+/).map((w) => ({ w: norm(w), id: s.id }))).filter((x) => x.w);
const heard = words.map((w) => ({ w: norm(w.text), t: w.start })).filter((x) => x.w);

// diferença palavra a palavra (LCS)
const n = want.length, m = heard.length;
const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = want[i].w === heard[j].w ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const diffs = [];
let i = 0, j = 0, cur = null;
const flush = () => { if (cur) diffs.push(cur); cur = null; };
while (i < n || j < m) {
  if (i < n && j < m && want[i].w === heard[j].w) { flush(); i++; j++; continue; }
  cur ??= { id: want[Math.min(i, n - 1)].id, t: heard[Math.min(j, m - 1)]?.t, a: [], b: [] };
  if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) cur.a.push(want[i++].w); else cur.b.push(heard[j++].w);
}
flush();
const ratio = (2 * L[0][0]) / (n + m);
ok(`Transcrição (${by}): ${(ratio * 100).toFixed(1)}% das palavras batem com o roteiro.`);
if (diffs.length) {
  info('Diferenças (a maioria é número escrito de um jeito e falado de outro; procure sigla ou nome lido errado):');
  for (const d of diffs.slice(0, 60)) info(`${d.id}${d.t != null ? ` @${mmss(d.t)}` : ''}  roteiro: ${d.a.join(' ') || '-'}  |  ouvido: ${d.b.join(' ') || '-'}`);
  if (diffs.length > 60) info(`… e mais ${diffs.length - 60}`);
}
if (ratio < 0.85) warn('Muitas diferenças. Ouça o vídeo: pode haver trecho cortado ou lido de forma estranha.');
