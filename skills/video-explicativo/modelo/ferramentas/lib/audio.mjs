// Áudio com ffmpeg: acha o binário, decodifica para PCM e grava WAV.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let cached = null;

// ffmpeg do pacote ffmpeg-static (instalado pelo npm) ou, se faltar, o do sistema.
export function ffmpegPath() {
  if (cached) return cached;
  const candidates = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  try { const p = require('ffmpeg-static'); if (p) candidates.push(p); } catch { /* pacote ausente */ }
  candidates.push('ffmpeg');
  for (const c of candidates) {
    if (c !== 'ffmpeg' && !fs.existsSync(c)) continue;
    const r = spawnSync(c, ['-hide_banner', '-version'], { encoding: 'utf8' });
    if (r.status === 0) { cached = c; return c; }
  }
  throw new Error('ffmpeg não encontrado. Rode "npm install" nesta pasta (ele baixa o ffmpeg) ou instale o ffmpeg no sistema.');
}

export function ff(args, opts = {}) {
  return execFileSync(ffmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', ...args],
    { stdio: ['ignore', opts.capture ? 'pipe' : 'inherit', 'inherit'], maxBuffer: 1 << 30 });
}

// Decodifica qualquer áudio para PCM mono de 16 bits na taxa pedida.
export function decodePcm(file, sr = 16000) {
  const buf = ff(['-i', file, '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '1', '-ar', String(sr), '-'], { capture: true });
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
}

// Converte para o formato de trabalho do projeto: WAV PCM 48 kHz mono.
export function toWorkWav(input, output) {
  ff(['-i', input, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', output]);
}

// Grava PCM 16 bits cru (por exemplo, o que o Gemini devolve) como WAV.
export function writeWav(file, pcm, sr, channels = 1) {
  const data = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// Duração exata de um WAV PCM gravado por este projeto.
export function wavDuration(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(4096);
  fs.readSync(fd, head, 0, 4096, 0);
  fs.closeSync(fd);
  const sr = head.readUInt32LE(24), block = head.readUInt16LE(32);
  let p = 12;
  while (p < head.length - 8) {
    const id = head.toString('ascii', p, p + 4), size = head.readUInt32LE(p + 4);
    if (id === 'data') return Math.min(size, fs.statSync(file).size - p - 8) / block / sr;
    p += 8 + size + (size % 2);
  }
  throw new Error(`WAV sem bloco de dados: ${file}`);
}
