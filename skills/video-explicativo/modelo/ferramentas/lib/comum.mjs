// Coisas compartilhadas pelas ferramentas: pastas, configuração, chaves de API e mensagens.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export const ROOT = process.cwd();
export const P = {
  audio: path.join(ROOT, 'audio'),
  work: path.join(ROOT, 'trabalho'),
  out: path.join(ROOT, 'saida'),
  docs: path.join(ROOT, 'docs'),
};
for (const d of Object.values(P)) fs.mkdirSync(d, { recursive: true });

if (!fs.existsSync(path.join(ROOT, 'video.config.js'))) {
  console.error('Rode este comando dentro da pasta do vídeo (onde fica o arquivo video.config.js).');
  process.exit(1);
}

export const config = (await import(pathToFileURL(path.join(ROOT, 'video.config.js')).href)).default;
export const { scenes, chapters } = await import(pathToFileURL(path.join(ROOT, 'motor/cenas.js')).href);
export const RITMO = config.ritmo || 1;
export const SLUG = config.slug || 'video';

// Arquivo global de chaves: vale para todos os vídeos do usuário.
export const KEYS_FILE = path.join(os.homedir(), '.config', 'video-explicativo', 'chaves.env');

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

// Ordem: variável de ambiente, .env da pasta do vídeo, arquivo global de chaves.
export function getKey(name) {
  return process.env[name] || parseEnv(path.join(ROOT, '.env'))[name] || parseEnv(KEYS_FILE)[name] || null;
}

export function keySource(name) {
  if (process.env[name]) return 'variável de ambiente';
  if (parseEnv(path.join(ROOT, '.env'))[name]) return '.env desta pasta';
  if (parseEnv(KEYS_FILE)[name]) return KEYS_FILE;
  return null;
}

export const ok = (msg) => console.log(`✅ ${msg}`);
export const bad = (msg) => console.log(`❌ ${msg}`);
export const warn = (msg) => console.log(`⚠️  ${msg}`);
export const info = (msg) => console.log(`   ${msg}`);

export const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function args() {
  const a = process.argv.slice(2);
  return {
    list: a,
    has: (k) => a.includes(k),
    get: (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null),
  };
}

// Abre um arquivo no aplicativo padrão do sistema (player de vídeo, visualizador de imagem).
export function openFile(file) {
  const cmd = process.platform === 'darwin' ? ['open', [file]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', file]] : ['xdg-open', [file]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref(); } catch { /* sem visualizador */ }
}
