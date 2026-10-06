// Cria a pasta de um vídeo novo a partir deste modelo.
// Uso: node <pasta-da-skill>/modelo/ferramentas/novo.mjs <pasta-destino> [--titulo "Título"] [--provedor gemini] [--tema noite]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODELO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const dest = argv.find((x, i) => !x.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!dest) { console.error('Informe a pasta do vídeo novo. Ex.: node novo.mjs ~/videos-explicativos/como-funciona-o-pix'); process.exit(1); }
const target = path.resolve(dest.replace(/^~(?=$|\/|\\)/, process.env.HOME || process.env.USERPROFILE || '~'));
if (fs.existsSync(target) && fs.readdirSync(target).length) { console.error(`A pasta ${target} já existe e não está vazia. Escolha outro nome.`); process.exit(1); }

const SKIP = new Set(['node_modules', 'audio', 'trabalho', 'saida', 'amostras', '.env', 'package-lock.json']);
fs.cpSync(MODELO, target, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || path.dirname(src) !== MODELO });

const slug = path.basename(target).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';
const cfgFile = path.join(target, 'video.config.js');
let cfg = fs.readFileSync(cfgFile, 'utf8').replace(/slug: '[^']*'/, `slug: '${slug}'`);
if (opt('--titulo')) cfg = cfg.replace(/titulo: '[^']*'/, `titulo: '${opt('--titulo').replace(/'/g, "\\'")}'`);
if (opt('--provedor')) cfg = cfg.replace(/provedor: '[^']*'/, `provedor: '${opt('--provedor')}'`);
if (opt('--tema')) cfg = cfg.replace(/tema: '[^']*'/, `tema: '${opt('--tema')}'`);
fs.writeFileSync(cfgFile, cfg);
const pkgFile = path.join(target, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
pkg.name = slug;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Pasta criada: ${target}`);
console.log('Próximo passo, dentro dela: npm install   e depois   npm run verificar');
