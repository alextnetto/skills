// Abre o palco num Chromium sem janela (Playwright).
import { serve } from './servidor.mjs';
import { W, H } from '../../motor/constantes.js';

export async function abrirPalco() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Pacotes não instalados. Rode "npm install" nesta pasta.'); }
  const { server, port } = await serve(process.cwd());
  const url = `http://127.0.0.1:${port}/motor/palco.html`;
  const browsers = [];
  const open = async () => {
    let browser;
    try {
      browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
    } catch (e) {
      if (/Executable doesn't exist|browserType.launch/.test(e.message)) throw new Error('Falta o navegador que desenha os quadros. Rode: npx playwright install --only-shell chromium');
      throw e;
    }
    browsers.push(browser);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction('window.__ready === true || window.__failed', null, { timeout: 20000 }).catch(() => {});
    const st = await page.evaluate(() => ({ ready: window.__ready === true, failed: window.__failed || null }));
    if (!st.ready) throw new Error(`O palco não carregou: ${st.failed || errors.join(' | ') || 'tempo esgotado'}`);
    page.__errors = errors;
    return page;
  };
  const close = async () => { await Promise.all(browsers.map((b) => b.close())); server.close(); };
  return { open, close };
}

// Carrega uma cena e devolve a mensagem de erro do roteiro em português, se houver.
export async function carregar(page, id) {
  try { return await page.evaluate((x) => window.loadScene(x), id); }
  catch (e) { throw new Error(e.message.replace(/^page\.evaluate: (Error: )?/, '').split('\n')[0]); }
}
