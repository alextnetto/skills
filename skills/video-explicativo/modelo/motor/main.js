// Palco: monta uma cena no navegador e expõe loadScene(id), seek(t) e checkLayout() para as ferramentas.
import config from '/video.config.js';
import { scenes, byId, fichaBefore, chapters } from './cenas.js';
import { FPS } from './constantes.js';
import { Timeline, cueTime } from './engine.js';
import * as C from './componentes.js';
import { FULL, FICHA } from './layout.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const RITMO = config.ritmo || 1;
const allFicha = scenes.flatMap((s) => s.ficha);
let current = null;

document.documentElement.dataset.tema = config.tema || 'papel';

const FACES = ['400 40px "Crimson Text"', 'italic 400 40px "Crimson Text"', '600 40px "Crimson Text"', 'italic 600 40px "Crimson Text"',
  '400 20px "IBM Plex Sans"', '500 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"',
  '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"'];

window.loadScene = async (id) => {
  const scene = byId(id);
  if (!scene) throw new Error(`não existe cena com id "${id}"`);
  await Promise.all(FACES.map((f) => document.fonts.load(f, 'ção R$ 1º')));
  const res = await fetch(`/audio/${id}.json`);
  if (!res.ok) throw new Error(`cena ${id} ainda não tem narração; rode "npm run previa" (sem custo) ou "npm run narrar"`);
  const raw = await res.json();
  const align = { id, text: raw.text, starts: raw.starts.map((x) => x / RITMO) };
  const audio = raw.duration / RITMO;

  const prev = scenes[scene.index - 1], next = scenes[scene.index + 1];
  const stage = document.getElementById('stage');
  stage.innerHTML = '';
  C.clearStates();
  const content = C.h('div'); content.id = 'content';
  const wires = document.createElementNS(SVGNS, 'svg');
  wires.id = 'wires'; wires.setAttribute('width', 1920); wires.setAttribute('height', 1080); wires.setAttribute('viewBox', '0 0 1920 1080');
  content.append(wires);
  const fichaRoot = C.h('div'); fichaRoot.id = 'ficha';
  const chrome = C.h('div'); chrome.id = 'chrome';
  stage.append(content, fichaRoot, chrome);

  const tl = new Timeline();
  const ctx = { scene, tl, content, wires, nodes: {}, images: [], area: scene.layout === 'ficha' ? FICHA : FULL,
    T: (spec) => cueTime(align, spec, scene.lead) };

  const continues = !!scene.continues;
  C.title(ctx, scene, continues && prev && prev.title === scene.title && prev.kicker === scene.kicker);
  if (scene.card) C.chapterCard(ctx, scene.card);
  const firstItem = tl.items.length;
  for (const it of scene.items) C.build(ctx, it);
  const recapAt = C.recap(ctx, scene);
  C.terms(ctx, scene, recapAt);
  const entrances = tl.items.slice(firstItem).map((x) => Math.max(0, x.at)).sort((a, b) => a - b);
  C.foot(ctx, scene);
  for (const el of content.children) { const c = el.getAttribute('class'); if (!el.dataset.item && c) el.dataset.item = c.split(' ')[0]; }

  await Promise.all(ctx.images.map((img) => img.decode().catch(() => {
    throw new Error(`cena ${id}: não consegui abrir a imagem ${img.getAttribute('src')} (confira o caminho dentro da pasta midia/)`);
  })));

  const duration = Math.max(scene.lead + audio + scene.tail, recapAt != null ? recapAt + 2.8 : 0, tl.lastCue() + 0.9);
  const frames = Math.ceil(duration * FPS);
  const total = frames / FPS;

  // camada de conteúdo: entra e sai suave, a não ser que a cena vizinha continue a mesma imagem
  C.fadeLayer(tl, content, continues ? -1 : 0, !next || next.continues ? null : total - 0.25); // a última cena segura o quadro final

  if (scene.layout === 'ficha') {
    const panel = C.ficha(ctx, fichaRoot, allFicha, fichaBefore(id), scene.ficha);
    const wasOn = prev && prev.layout === 'ficha', staysOn = !next || next.layout === 'ficha';
    const at = scene.fichaAt != null ? ctx.T(scene.fichaAt) : wasOn ? -1 : 0.15;
    C.fadeLayer(tl, panel, at, staysOn ? null : total - 0.3, 0.4);
  } else if (scene.ficha.length) throw new Error(`cena ${id}: itens de ficha só funcionam com layout: 'ficha'`);
  C.progress(chrome, scene, scenes, chapters);

  // momentos em que cada item termina de entrar: é aí que o verificador de layout olha a tela
  const checkTimes = [...new Set(tl.items.filter((it) => it.at >= 0).map((it) => Math.min(total - 0.3, it.at + it.dur + 0.05).toFixed(2)))]
    .map(Number).concat([total - 0.3]).sort((a, b) => a - b);

  // ritmo visual: quanto tempo a cena fica sem nada novo entrando na tela
  const pace = [];
  if (!scene.card && !scene.continues) {
    if (!entrances.length) pace.push(`a cena inteira (${total.toFixed(0)} s) só tem o título; ponha algo na tela`);
    else if (entrances[0] > 4) pace.push(`a cena fica só com o título por ${entrances[0].toFixed(1)} s; antecipe o primeiro item (at: 0.4 ou a primeira frase da fala)`);
  }
  const marks = [...(scene.card ? [0] : []), ...entrances, Math.max(0, total - scene.tail)];
  for (let k = 1; k < marks.length; k++) {
    if (marks[k] - marks[k - 1] > 12) pace.push(`${(marks[k] - marks[k - 1]).toFixed(0)} s sem nada novo na tela (de ${marks[k - 1].toFixed(1)} a ${marks[k].toFixed(1)} s); acrescente um item ou divida a cena`);
  }

  current = { tl, scene };
  window.seek(0);
  return { id, duration: total, frames, audio, lead: scene.lead, checkTimes, pace };
};

window.seek = (t) => {
  C.resetStates();
  const sig = current.tl.seek(t);
  C.flushStates();
  return sig;
};

// ---- verificador de layout: problemas visíveis no instante atual ----
const op = (e) => (e.style.opacity === '' ? 1 : parseFloat(e.style.opacity));
const rectOf = (e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; };
const union = (a, b) => (!a ? b : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const inter = (a, b) => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
const contains = (a, b) => a.x0 <= b.x0 + 2 && a.y0 <= b.y0 + 2 && a.x1 >= b.x1 - 2 && a.y1 >= b.y1 - 2;

// Caixa visível de um item: ele mesmo ou só as partes já reveladas (listas, tabelas e gráficos entram por partes).
function visibleBox(el) {
  if (op(el) < 0.5) return null;
  const kids = [...el.querySelectorAll('*')].filter((k) => k.style.opacity !== '');
  if (!kids.length) return rectOf(el);
  let box = null;
  for (const k of kids) {
    let o = 1;
    for (let e = k; e && e !== el; e = e.parentElement) o *= op(e);
    if (o >= 0.5 && area(rectOf(k)) > 0) box = union(box, rectOf(k));
  }
  return box && el.classList.contains('code') ? union(box, rectOf(el)) : box;
}

window.checkLayout = () => {
  if (op(document.getElementById('content')) < 0.5) return [];
  const out = [];
  const items = [...document.querySelectorAll('#content > .abs')].map((el) => ({ el, box: visibleBox(el), name: el.dataset.item || el.className }))
    .filter((x) => x.box && area(x.box) > 0);
  for (const { el, box, name } of items) {
    const isFoot = el.classList.contains('foot');
    if (box.x0 < 40 || box.x1 > 1880 || box.y0 < 30 || box.y1 > (isFoot ? 1000 : 985))
      out.push(`${name}: sai da área segura da tela (x ${Math.round(box.x0)} a ${Math.round(box.x1)}, y ${Math.round(box.y0)} a ${Math.round(box.y1)})`);
    for (const t of [el, ...el.querySelectorAll('.t, .label, .tx, .td, .rt, .td2, .num, .lbl')]) {
      if (t.clientWidth > 0 && t.scrollWidth > t.clientWidth + 2)
        out.push(`${name}: texto mais largo que a caixa (${t.scrollWidth}px em ${t.clientWidth}px); diminua o size, aumente o w ou encurte o texto`);
    }
    if (el.classList.contains('node') && el.scrollHeight > el.clientHeight + 2)
      out.push(`${name}: o texto não cabe na altura do bloco (${el.scrollHeight}px em ${el.clientHeight}px); aumente o h ou encurte`);
  }
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const A = items[a].box, B = items[b].box;
      if (contains(A, B) || contains(B, A)) continue; // grupo em volta de blocos é intencional
      const ov = area(inter(A, B));
      if (ov > 300 && ov > 0.02 * Math.min(area(A), area(B)))
        out.push(`${items[a].name} encosta em ${items[b].name} (${Math.round(ov)} px² sobrepostos)`);
    }
  }
  const panel = document.querySelector('#ficha .panel');
  if (panel && op(panel) >= 0.5) {
    const P = rectOf(panel);
    for (const { box, name } of items) if (area(inter(box, P)) > 200) out.push(`${name}: invade o painel da ficha (use x + w até 1290)`);
    for (const fv of panel.querySelectorAll('.fv, .sl')) if (fv.scrollWidth > fv.clientWidth + 2) out.push(`ficha: "${fv.textContent}" é longo demais para o painel`);
    const lastRow = [...panel.children].pop();
    if (lastRow && rectOf(lastRow).y1 > P.y1 - 10) out.push('ficha: itens demais para o painel (cabem cerca de 9 campos e 6 carimbos no vídeo inteiro)');
  }
  return out;
};

window.sceneIds = () => scenes.map((s) => s.id);
window.__ready = true;
