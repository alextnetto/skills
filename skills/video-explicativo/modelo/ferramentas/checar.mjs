// Verificador de layout: abre cada cena, para nos momentos em que algo termina de entrar e procura
// texto estourando a caixa, itens encostados e coisas fora da área segura da tela.
// Uso: npm run checar [-- --cenas c1s1,c2s3]
import { scenes, args, ok, bad, warn } from './lib/comum.mjs';
import { abrirPalco, carregar } from './lib/palco.mjs';

const a = args();
const want = a.get('--cenas')?.split(',');
const list = scenes.filter((s) => !want || want.includes(s.id));
const palco = await abrirPalco();
let total = 0, errors = 0;
try {
  const page = await palco.open();
  for (const s of list) {
    let info;
    try { info = await carregar(page, s.id); }
    catch (e) { bad(`${s.id}: ${e.message}`); errors++; continue; }
    for (const p of info.pace) { warn(`${s.id}  ${p}`); total++; }
    const seen = new Map();
    for (const t of info.checkTimes) {
      await page.evaluate((x) => window.seek(x), t);
      for (const p of await page.evaluate(() => window.checkLayout())) if (!seen.has(p)) seen.set(p, t);
    }
    for (const [p, t] of seen) { warn(`${s.id} @${t.toFixed(1)}s  ${p}`); total++; }
  }
} finally { await palco.close(); }
if (errors) { bad(`${errors} cena(s) não abriram. Corrija o erro do roteiro indicado acima.`); process.exitCode = 1; }
if (total) { bad(`${total} problema(s) de layout. Ajuste x, y, w, h ou size dos itens citados e rode de novo.`); process.exitCode = 1; }
else if (!errors) ok(`Layout sem problemas detectados em ${list.length} cenas.`);
