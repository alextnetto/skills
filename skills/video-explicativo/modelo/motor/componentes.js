// DOM/SVG builders. Each builder positions elements from explicit coordinates and registers
// timeline items; nothing here reads the clock.
import { easeOutCubic, easeOutBack, easeInOutCubic, clamp01, fmt } from './engine.js';
import config from '/video.config.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const lin = (x) => x;

export function h(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}
const sv = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const rich = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');
const place = (el, { x, y, w, h: hh }) => {
  el.classList.add('abs');
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  if (w != null) el.style.width = `${w}px`;
  if (hh != null) el.style.height = `${hh}px`;
  return el;
};

// ---- per-element animation state, reset before and flushed after every seek ----
const states = new Map();
export function st(el) {
  let s = states.get(el);
  if (!s) { s = { o: 1, ty: 0, sc: 1, glow: 0 }; states.set(el, s); }
  return s;
}
export function resetStates() { for (const s of states.values()) { s.o = 1; s.ty = 0; s.sc = 1; s.glow = 0; } }
export function flushStates() {
  for (const [el, s] of states) {
    el.style.opacity = s.o.toFixed(3);
    const base = el.dataset.baseT || '';
    el.style.transform = `${base} translateY(${s.ty.toFixed(2)}px) scale(${s.sc.toFixed(4)})`.trim();
    el.style.boxShadow = s.glow > 0.002 ? `0 0 0 ${(9 * s.glow).toFixed(1)}px rgba(var(--glow-rgb),${(0.28 * s.glow).toFixed(3)})` : '';
  }
}
export function clearStates() { states.clear(); }

// ---- entrances ----
export function rise(tl, el, at, out, dist = 16) {
  st(el);
  tl.add({ at, out, dur: 0.5, apply: ({ p, vis }) => { const s = st(el); s.o *= p * vis; s.ty += (1 - p) * dist; } });
}
export function pop(tl, el, at, out) {
  st(el);
  tl.add({ at, out, dur: 0.55, ease: lin, apply: ({ p, vis }) => {
    const s = st(el); s.o *= easeOutCubic(clamp01(p * 1.6)) * vis; s.sc *= 0.9 + 0.1 * easeOutBack(p);
  } });
}
export function fadeLayer(tl, el, at, out, dur = 0.25) {
  st(el);
  tl.add({ at, out, dur, outDur: 0.25, ease: lin, apply: ({ p, vis }) => { st(el).o *= p * vis; } });
}

const CHECK = (color = 'currentColor', size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---- builders ----
export function build(ctx, it) {
  const fn = BUILDERS[it.type];
  if (!fn) throw new Error(`cena ${ctx.scene.id}: tipo de item desconhecido "${it.type}". Tipos válidos: ${Object.keys(BUILDERS).join(', ')}`);
  const before = ctx.content.children.length;
  const out = fn(ctx, it);
  // etiqueta os elementos novos para o verificador de layout dizer qual item tem problema
  const hint = String(it.text || it.label || it.title || it.id || it.src || '').replace(/\*/g, '').slice(0, 40);
  for (let k = before; k < ctx.content.children.length; k++) ctx.content.children[k].dataset.item = `${it.type}${hint ? ` "${hint}"` : ''}`;
  return out;
}

const BUILDERS = {
  text(ctx, it) {
    const el = place(h('div', `t f-${it.font || 'serif'} c-${it.color || 'text'}`, rich(it.text)), it);
    Object.assign(el.style, { fontSize: `${it.size || 40}px`, fontWeight: it.weight || 400, textAlign: it.align || 'left',
      fontStyle: it.italic ? 'italic' : 'normal', lineHeight: it.lh || 1.22 });
    ctx.content.append(el);
    rise(ctx.tl, el, ctx.T(it.at), it.out != null ? ctx.T(it.out) : null);
  },

  rule(ctx, it) {
    const el = place(h('div', 'rule'), it);
    ctx.content.append(el);
    ctx.tl.add({ at: ctx.T(it.at), dur: 0.7, ease: easeInOutCubic, apply: ({ p }) => { el.style.transform = `scaleX(${p.toFixed(4)})`; } });
  },

  node(ctx, it) {
    const el = place(h('div', `node tone-${it.tone || 'ink'}`), it);
    el.append(h('div', 'label', rich(it.label)));
    if (it.sub) el.append(h('div', 'sub', rich(it.sub)));
    ctx.content.append(el);
    ctx.nodes[it.id] = { ...it, el };
    pop(ctx.tl, el, ctx.T(it.at), it.out != null ? ctx.T(it.out) : null);
  },

  group(ctx, it) {
    const el = place(h('div', `group tone-${it.tone || 'ink'}`), it);
    el.append(h('div', 'chip', esc(it.label)));
    ctx.content.append(el);
    rise(ctx.tl, el, ctx.T(it.at), null, 10);
  },

  edge(ctx, it) {
    const a = ctx.nodes[it.from], b = ctx.nodes[it.to];
    if (!a || !b) throw new Error(`cena ${ctx.scene.id}: a seta ${it.from}->${it.to} aponta para um bloco que não existe (declare os nodes antes das edges)`);
    const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const dx = cb.x - ca.x, dy = cb.y - ca.y, horiz = Math.abs(dx) >= Math.abs(dy), G = 9;
    let p1, p2;
    if (horiz) { p1 = { x: dx > 0 ? a.x + a.w + G : a.x - G, y: ca.y }; p2 = { x: dx > 0 ? b.x - G : b.x + b.w + G, y: cb.y }; }
    else { p1 = { x: ca.x, y: dy > 0 ? a.y + a.h + G : a.y - G }; p2 = { x: cb.x, y: dy > 0 ? b.y - G : b.y + b.h + G }; }
    let d, endDir, mid;
    if (it.bend) {
      const vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy), n = { x: -vy / len, y: vx / len };
      const sh = it.bend * 0.3;
      p1 = { x: p1.x + n.x * sh, y: p1.y + n.y * sh }; p2 = { x: p2.x + n.x * sh, y: p2.y + n.y * sh };
      const c = { x: (p1.x + p2.x) / 2 + n.x * it.bend * 1.5, y: (p1.y + p2.y) / 2 + n.y * it.bend * 1.5 };
      d = `M${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}`;
      endDir = { x: p2.x - c.x, y: p2.y - c.y };
      mid = { x: 0.25 * p1.x + 0.5 * c.x + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * c.y + 0.25 * p2.y };
    } else if (horiz ? Math.abs(p1.y - p2.y) < 2 : Math.abs(p1.x - p2.x) < 2) {
      d = `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
      endDir = { x: p2.x - p1.x, y: p2.y - p1.y }; mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    } else {
      const c1 = horiz ? { x: p1.x + (p2.x - p1.x) / 2, y: p1.y } : { x: p1.x, y: p1.y + (p2.y - p1.y) / 2 };
      const c2 = horiz ? { x: p2.x - (p2.x - p1.x) / 2, y: p2.y } : { x: p2.x, y: p2.y - (p2.y - p1.y) / 2 };
      d = `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
      endDir = { x: p2.x - c2.x, y: p2.y - c2.y }; mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
    const path = sv('path', { d, class: `edge${it.dashed ? ' dashed' : ''}` });
    ctx.wires.append(path);
    const len = path.getTotalLength();
    const ang = (Math.atan2(endDir.y, endDir.x) * 180) / Math.PI;
    const arrow = sv('path', { d: 'M0,0 L-17,-8 L-17,8 Z', class: 'arrow', transform: `translate(${p2.x},${p2.y}) rotate(${ang})` });
    ctx.wires.append(arrow);
    let label;
    if (it.label) {
      label = place(h('div', 'edge-label', esc(it.label)), { x: mid.x, y: mid.y });
      label.dataset.baseT = 'translate(-50%, -50%)';
      ctx.content.append(label); st(label);
    }
    ctx.tl.add({ at: ctx.T(it.at), dur: 0.6, ease: easeInOutCubic, apply: ({ p }) => {
      if (it.dashed) { path.style.opacity = p.toFixed(3); }
      else { path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${(len * (1 - p)).toFixed(2)}`; path.style.opacity = p > 0 ? 1 : 0; }
      arrow.style.opacity = clamp01((p - 0.75) / 0.25).toFixed(3);
      if (label) st(label).o *= clamp01((p - 0.3) / 0.5);
    } });
  },

  emph(ctx, it) {
    const n = ctx.nodes[it.target];
    if (!n) throw new Error(`cena ${ctx.scene.id}: emph aponta para o bloco "${it.target}", que não existe`);
    ctx.tl.add({ at: ctx.T(it.at), dur: it.dur || 1.0, ease: lin, apply: ({ p }) => {
      const bell = Math.sin(Math.PI * p); const s = st(n.el); s.sc *= 1 + 0.045 * bell; s.glow = Math.max(s.glow, bell);
    } });
  },

  strike(ctx, it) {
    const n = ctx.nodes[it.target];
    if (!n) throw new Error(`cena ${ctx.scene.id}: strike aponta para o bloco "${it.target}", que não existe`);
    const bar = h('div', 'bar'); n.el.append(bar);
    ctx.tl.add({ at: ctx.T(it.at), dur: 0.5, apply: ({ p }) => { bar.style.width = `${(p * 106).toFixed(2)}%`; st(n.el).o *= 1 - 0.45 * p; } });
  },

  list(ctx, it) {
    const size = it.size || 36;
    const el = place(h('div', `list tone-${it.tone || 'ink'}`), it);
    el.style.rowGap = `${it.gap ?? 20}px`;
    if (it.columns) { el.style.gridTemplateColumns = `repeat(${it.columns}, 1fr)`; el.style.columnGap = '30px'; }
    it.items.forEach((li, i) => {
      const row = h('div', `li tone-${li.tone || 'none'}`);
      const mk = h('div', `mk ${it.marker || 'dash'}`);
      const box = Math.round(size * 1.2);
      if (it.marker === 'num') { mk.textContent = String((li.n ?? i) + 1); Object.assign(mk.style, { width: `${box}px`, height: `${box}px`, fontSize: `${Math.round(size * 0.62)}px` }); }
      else if (it.marker === 'check') { mk.innerHTML = CHECK('currentColor', Math.round(size * 0.8)); mk.style.height = `${Math.round(size * 1.25)}px`; }
      else if (it.marker === 'none') { mk.style.display = 'none'; row.style.gridTemplateColumns = '1fr'; }
      else { mk.style.height = `${Math.round(size * 1.25)}px`; }
      const body = h('div');
      const tx = h('div', 'tx', rich(li.text)); tx.style.fontSize = `${size}px`;
      body.append(tx);
      if (li.sub) { const sb = h('div', 'sb', rich(li.sub)); sb.style.fontSize = `${Math.round(size * 0.72)}px`; body.append(sb); }
      row.append(mk, body); el.append(row);
      rise(ctx.tl, row, ctx.T(li.at));
    });
    ctx.content.append(el);
  },

  table(ctx, it) {
    const el = place(h('div', 'table'), it);
    el.style.fontSize = `${it.size || 30}px`;
    const tpl = it.cols.map((c) => `${c.w}fr`).join(' ');
    const mkRow = (cells, cls) => {
      const r = h('div', `tr ${cls}`); r.style.gridTemplateColumns = tpl;
      cells.forEach((c, i) => { const td = h('div', 'td', rich(c)); td.style.textAlign = it.cols[i].align || 'left'; r.append(td); });
      el.append(r); return r;
    };
    rise(ctx.tl, mkRow(it.cols.map((c) => c.label), 'head'), ctx.T(it.headAt ?? 0.3), null, 8);
    it.rows.forEach((row) => rise(ctx.tl, mkRow(row.cells, `tone-${row.tone || 'none'}`), ctx.T(row.at)));
    ctx.content.append(el);
  },

  code(ctx, it) {
    const el = place(h('div', `code tone-${it.tone || 'none'}`), it);
    el.style.fontSize = `${it.size || 30}px`;
    if (it.title) el.append(h('div', 'ttl', esc(it.title)));
    const bars = [];
    let first = Infinity;
    it.lines.forEach((ln) => {
      const row = h('div', `ln tone-${ln.tone || 'none'}`, esc(ln.text));
      const bar = h('div', 'bar'); row.append(bar); bars.push(bar);
      el.append(row);
      const at = ctx.T(ln.at); if (at !== -1) first = Math.min(first, at);
      rise(ctx.tl, row, at, null, 10);
    });
    ctx.content.append(el);
    rise(ctx.tl, el, first === Infinity ? -1 : Math.max(0, first - 0.35), null, 10);
    if (it.strikeAt) {
      ctx.tl.add({ at: ctx.T(it.strikeAt), dur: 0.6, apply: ({ p }) => { bars.forEach((b) => { b.style.width = `${(p * 100).toFixed(2)}%`; }); st(el).o *= 1 - 0.4 * p; } });
    }
  },

  big(ctx, it) {
    const el = place(h('div', 'big'), it);
    const num = h('div', 'num'); num.style.fontSize = `${it.size || 200}px`;
    el.append(num, h('div', 'lbl', esc(it.label)));
    ctx.content.append(el);
    const at = ctx.T(it.at);
    rise(ctx.tl, el, at);
    const from = it.from ?? 0;
    ctx.tl.add({ at, dur: it.countDur || 1.1, apply: ({ p }) => {
      const dec = it.decimals || 0, k = 10 ** dec;
      num.textContent = `${it.prefix || ''}${fmt(Math.round((from + (it.value - from) * p) * k) / k, dec)}${it.suffix || ''}`;
    } });
  },

  meter(ctx, it) {
    const el = place(h('div', 'meter'), { x: it.x, y: it.y, w: it.w, h: 170 });
    const px = (v) => (v / it.max) * it.w;
    const track = h('div', 'track'); Object.assign(track.style, { left: '0px', top: '56px', width: `${it.w}px` });
    const base = h('div', 'fill base'), over = h('div', 'fill over');
    over.style.left = `${px(it.mark)}px`;
    track.append(base, over);
    const mark = h('div', 'mark'); Object.assign(mark.style, { left: `${px(it.mark)}px`, top: '40px', height: '78px' });
    const markLab = h('div', 'lab', esc(it.markLabel)); Object.assign(markLab.style, { left: `${px(it.mark)}px`, top: '0px', transform: 'translateX(-50%)', color: 'var(--text)' });
    markLab.dataset.baseT = 'translateX(-50%)';
    const valLab = h('div', 'lab', esc(it.valueLabel)); Object.assign(valLab.style, { left: '0px', top: '118px', color: 'var(--ink)' });
    const overLab = h('div', 'lab', esc(it.overLabel)); Object.assign(overLab.style, { right: '0px', top: '118px', color: 'var(--accent)' });
    el.append(track, mark, markLab, valLab, overLab);
    ctx.content.append(el);
    rise(ctx.tl, el, Math.max(0, ctx.T(it.markAt) - 0.6), null, 10);
    rise(ctx.tl, markLab, ctx.T(it.markAt), null, 8);
    ctx.tl.add({ at: ctx.T(it.markAt), dur: 0.4, apply: ({ p }) => { mark.style.opacity = p.toFixed(3); } });
    ctx.tl.add({ at: ctx.T(it.valueAt), dur: 1.4, ease: easeInOutCubic, apply: ({ p }) => {
      const cur = it.value * p;
      base.style.width = `${px(Math.min(cur, it.mark)).toFixed(2)}px`;
      over.style.width = `${px(Math.max(0, cur - it.mark)).toFixed(2)}px`;
    } });
    rise(ctx.tl, valLab, ctx.T(it.valueAt) + 0.5, null, 8);
    rise(ctx.tl, overLab, ctx.T(it.overAt), null, 8);
  },

  range(ctx, it) {
    const LW = 560, RH = 130, bw = it.w - LW - 170;
    const el = place(h('div', 'range'), { x: it.x, y: it.y, w: it.w, h: it.rows.length * RH + 70 });
    const px = (v) => LW + (v / it.max) * bw;
    it.rows.forEach((r, i) => {
      const top = i * RH;
      const lab = place(h('div'), { x: 0, y: top + 6, w: LW - 40 });
      lab.append(h('div', 'rl', esc(r.label)), h('div', 'rn', esc(r.note || '')));
      const bar = h('div', `rb tone-${r.tone || 'ink'}`);
      Object.assign(bar.style, { left: `${px(r.lo)}px`, top: `${top + 14}px`, width: `${px(r.hi) - px(r.lo)}px` });
      const val = h('div', 'rv', `${fmt(r.lo)} a ${fmt(r.hi)}`);
      Object.assign(val.style, { left: `${px(r.hi) + 18}px`, top: `${top + 14}px` });
      el.append(lab, bar, val);
      const at = ctx.T(r.at);
      rise(ctx.tl, lab, at, null, 10);
      ctx.tl.add({ at, dur: 0.9, ease: easeInOutCubic, apply: ({ p }) => { bar.style.transform = `scaleX(${p.toFixed(4)})`; bar.style.opacity = p > 0 ? 1 : 0; } });
      rise(ctx.tl, val, at + 0.6, null, 8);
    });
    const axY = it.rows.length * RH - 20;
    const ax = h('div', 'ax'); Object.assign(ax.style, { left: `${LW}px`, top: `${axY}px`, width: `${bw}px` });
    el.append(ax);
    for (let v = 0; v <= it.max; v += 50) {
      const tk = h('div', 'tk', String(v)); Object.assign(tk.style, { left: `${px(v)}px`, top: `${axY + 8}px` }); el.append(tk);
    }
    const unit = h('div', 'tk', esc(it.unit)); Object.assign(unit.style, { left: `${LW + bw + 24}px`, top: `${axY + 8}px`, transform: 'none', whiteSpace: 'nowrap' }); el.append(unit);
    ctx.content.append(el);
    rise(ctx.tl, el, 0.3, null, 8);
  },

  timeline(ctx, it) {
    const line = sv('path', { d: `M${it.x},${it.y} L${it.x + it.w},${it.y}`, class: 'edge' });
    ctx.wires.append(line);
    const len = it.w;
    ctx.tl.add({ at: ctx.T(it.at ?? 0.3), dur: 0.9, ease: easeInOutCubic, apply: ({ p }) => {
      line.style.strokeDasharray = `${len}`; line.style.strokeDashoffset = `${(len * (1 - p)).toFixed(2)}`; line.style.opacity = p > 0 ? 1 : 0;
    } });
    [['startLabel', 0], ['endLabel', 1]].forEach(([k, pos]) => {
      if (!it[k]) return;
      const e = place(h('div', 'tl-end', esc(it[k])), { x: it.x + pos * it.w, y: it.y + 22 });
      e.dataset.baseT = 'translateX(-50%)'; ctx.content.append(e); rise(ctx.tl, e, ctx.T(it.at ?? 0.3) + 0.4, null, 6);
    });
    it.points.forEach((pt) => {
      const cx = it.x + pt.pos * it.w, at = ctx.T(pt.at);
      const dot = place(h('div', `tl-dot tone-${pt.tone || 'ink'}`), { x: cx, y: it.y });
      dot.dataset.baseT = 'translate(-50%, -50%)'; ctx.content.append(dot); pop(ctx.tl, dot, at);
      const [a, b] = pt.label.replace(/\\\|/g, '|').split('|');
      const lab = h('div', `tl-lab tone-${pt.tone || 'ink'}`, `<div class="d">${esc(pt.date)}</div><div class="a">${esc(a)}</div>${b ? `<div class="b">${esc(b)}</div>` : ''}`);
      const lx = Math.min(Math.max(cx, ctx.area.x + 150), ctx.area.x + ctx.area.w - 150);
      place(lab, { x: lx, y: pt.side === 'up' ? it.y - 30 : it.y + 30 });
      lab.dataset.baseT = pt.side === 'up' ? 'translate(-50%, -100%)' : 'translateX(-50%)';
      ctx.content.append(lab); rise(ctx.tl, lab, at + 0.1, null, pt.side === 'up' ? -12 : 12);
    });
  },

  // horizontal bars on one linear scale (small values stay small on purpose)
  hbars(ctx, it) {
    const LW = it.labelW ?? 520, RH = it.rowH ?? 92, bw = it.w - LW - 260;
    const el = place(h('div', 'hbars'), { x: it.x, y: it.y, w: it.w, h: it.rows.length * RH });
    it.rows.forEach((r, i) => {
      const top = i * RH;
      const lab = place(h('div'), { x: 0, y: top + (r.note ? 0 : 11), w: LW - 30 }); // sem nota, centraliza o rótulo na barra
      lab.append(h('div', 'rl', rich(r.label)), h('div', 'rn', esc(r.note || '')));
      const width = Math.max(8, (r.value / it.max) * bw);
      const bar = h('div', `rb tone-${r.tone || 'ink'}`);
      Object.assign(bar.style, { left: `${LW}px`, top: `${top + 8}px`, width: `${width}px` });
      const val = h('div', 'rv', esc(r.display));
      Object.assign(val.style, { left: `${LW + width + 18}px`, top: `${top + 8}px` });
      el.append(lab, bar, val);
      const at = ctx.T(r.at);
      rise(ctx.tl, lab, at, null, 10);
      ctx.tl.add({ at, dur: 0.9, ease: easeInOutCubic, apply: ({ p }) => { bar.style.transform = `scaleX(${p.toFixed(4)})`; bar.style.opacity = p > 0 ? 1 : 0; } });
      rise(ctx.tl, val, at + 0.6, null, 8);
    });
    ctx.content.append(el);
  },

  // stacked vertical bars, one per year
  bars(ctx, it) {
    const el = place(h('div', 'bars'), { x: it.x, y: it.y, w: it.w, h: it.h });
    const legend = h('div', 'lg');
    it.series.forEach((sr) => { legend.append(h('div', 'lgi', `<i class="sw tone-${sr.tone}"></i>${esc(sr.name)}`)); });
    el.append(legend);
    const top = 70, plotH = it.h - top - 56, AX = 140, plotW = it.w - AX;
    const py = (v) => top + plotH - (v / it.max) * plotH;
    (it.ticks || []).forEach((v) => {
      const g = h('div', 'grid'); Object.assign(g.style, { left: `${AX}px`, top: `${py(v)}px`, width: `${plotW}px` });
      const tk = h('div', 'ytk', esc(it.tickFmt ? it.tickFmt.replace('#', fmt(v)) : fmt(v))); Object.assign(tk.style, { left: '0px', top: `${py(v) - 13}px`, width: `${AX - 14}px` });
      el.append(g, tk);
    });
    const slot = plotW / it.years.length, bwid = Math.min(150, slot * 0.56);
    it.years.forEach((yr, i) => {
      const cx = AX + slot * (i + 0.5), total = yr.values.reduce((a, b) => a + b, 0);
      const col = h('div', 'col'); Object.assign(col.style, { left: `${cx - bwid / 2}px`, top: `${py(total)}px`, width: `${bwid}px`, height: `${(total / it.max) * plotH}px` });
      [...yr.values].map((v, k) => ({ v, k })).reverse().forEach(({ v, k }) => {
        const seg = h('div', `seg2 tone-${it.series[k].tone}`); seg.style.height = `${(v / total) * 100}%`; col.append(seg);
      });
      const xl = h('div', 'xl', esc(yr.label)); Object.assign(xl.style, { left: `${cx}px`, top: `${top + plotH + 12}px` });
      const tot = h('div', 'tot', esc(yr.totalLabel)); Object.assign(tot.style, { left: `${cx}px`, top: `${py(total) - 44}px` });
      tot.dataset.baseT = 'translateX(-50%)'; xl.dataset.baseT = 'translateX(-50%)';
      el.append(col, xl, tot);
      const at = ctx.T(yr.at);
      ctx.tl.add({ at, dur: 1.0, ease: easeInOutCubic, apply: ({ p }) => { col.style.transform = `scaleY(${p.toFixed(4)})`; col.style.opacity = p > 0 ? 1 : 0; } });
      rise(ctx.tl, xl, at, null, 6); rise(ctx.tl, tot, at + 0.7, null, 8);
    });
    ctx.content.append(el);
    rise(ctx.tl, el, 0.3, null, 8);
  },

  // bars around a zero line (cumulative cash): negative values hang below it, positive ones stand above it
  jbars(ctx, it) {
    const el = place(h('div', 'jbars'), { x: it.x, y: it.y, w: it.w, h: it.h });
    const AX = it.axisW ?? 120, top = 60, bottom = it.h - 20, plotW = it.w - AX;
    const py = (v) => top + ((it.max - v) / (it.max - it.min)) * (bottom - top);
    const zero = py(0);
    if (it.caption) { const cap = h('div', 'jcap', esc(it.caption)); Object.assign(cap.style, { left: '0px', top: '0px' }); el.append(cap); }
    (it.ticks || []).forEach((v) => {
      const g = h('div', v === 0 ? 'jzero' : 'grid'); Object.assign(g.style, { left: `${AX}px`, top: `${py(v)}px`, width: `${plotW}px` });
      const tk = h('div', 'ytk', esc((it.tickFmt ? it.tickFmt.replace('#', fmt(v)) : fmt(v)).replace('-', '−'))); Object.assign(tk.style, { left: '0px', top: `${py(v) - 13}px`, width: `${AX - 14}px` });
      el.append(g, tk);
    });
    const slot = plotW / it.bars.length, bw = Math.min(it.barW ?? 90, slot * 0.62);
    it.bars.forEach((b, i) => {
      const cx = AX + slot * (i + 0.5), neg = b.value < 0;
      const y0 = py(Math.max(0, b.value)), y1 = py(Math.min(0, b.value));
      const bar = h('div', `jb tone-${b.tone || 'ink'}`);
      Object.assign(bar.style, { left: `${cx - bw / 2}px`, top: `${y0}px`, width: `${bw}px`, height: `${Math.max(3, y1 - y0)}px`, transformOrigin: neg ? 'top center' : 'bottom center' });
      const xl = h('div', 'jx', esc(b.label)); Object.assign(xl.style, { left: `${cx}px`, top: neg ? `${zero - 34}px` : `${zero + 10}px` });
      xl.dataset.baseT = 'translateX(-50%)';
      const val = h('div', `jv tone-${b.tone || 'ink'}`, esc(b.display)); Object.assign(val.style, { left: `${cx}px`, top: neg ? `${y1 + 8}px` : `${y0 - 38}px` });
      val.dataset.baseT = 'translateX(-50%)';
      el.append(bar, xl, val);
      const at = ctx.T(b.at);
      ctx.tl.add({ at, dur: 0.7, ease: easeInOutCubic, apply: ({ p }) => { bar.style.transform = `scaleY(${p.toFixed(4)})`; bar.style.opacity = p > 0 ? 1 : 0; } });
      rise(ctx.tl, xl, at, null, 6); rise(ctx.tl, val, at === -1 ? -1 : at + 0.45, null, 6);
    });
    ctx.content.append(el);
    rise(ctx.tl, el, ctx.T(it.at ?? 0.3), null, 8);
  },

  // revenue-per-customer tower: layers stack from the bottom, the total follows the top
  tower(ctx, it) {
    const TW = it.towerW ?? 380;
    const el = place(h('div', 'tower'), { x: it.x, y: it.y, w: it.w, h: it.h });
    const base = it.h - 10, scale = (it.h - 110) / it.max, ps = it.layers.map(() => 0);
    const total = h('div', 'ttot'); el.append(total);
    const cap = h('div', 'tcap', esc(it.caption || '')); Object.assign(cap.style, { left: '0px', top: `${base + 14}px`, width: `${TW}px` }); el.append(cap);
    let acc = 0;
    it.layers.forEach((ly, i) => {
      if (ly.at == null) return; // not revealed yet in this scene
      const hh = ly.value * scale, bottom = base - acc; acc += hh;
      const box = h('div', `tl2 tone-${ly.tone || 'ink'}`); Object.assign(box.style, { left: '0px', top: `${bottom - hh}px`, width: `${TW}px`, height: `${hh - 4}px` });
      const lab = h('div', 'tlab', `<b>${esc(ly.label)}</b><span>${esc(ly.display)}</span>${ly.note ? `<em>${esc(ly.note)}</em>` : ''}`);
      Object.assign(lab.style, { left: `${TW + 34}px`, top: `${bottom - hh / 2 - 30}px`, width: `${it.w - TW - 34}px` });
      el.append(box, lab);
      const at = ctx.T(ly.at);
      ctx.tl.add({ at, dur: 0.8, ease: easeInOutCubic, apply: ({ p }) => { ps[i] = p; box.style.transform = `scaleY(${p.toFixed(4)})`; box.style.opacity = p > 0 ? 1 : 0; } });
      rise(ctx.tl, lab, at + 0.2, null, 10);
    });
    ctx.tl.add({ at: -1, apply: () => {
      const sum = it.layers.reduce((n, ly, i) => n + ly.value * ps[i], 0);
      total.textContent = `${it.prefix || 'R$ '}${fmt(Math.round(sum / (it.round || 100)) * (it.round || 100))}${it.suffix || ' / mês'}`;
      total.style.top = `${base - sum * scale - 62}px`; total.style.opacity = sum > 0 ? 1 : 0;
    } });
    ctx.content.append(el);
    rise(ctx.tl, el, 0.3, null, 8);
  },

  // capital stack of the fund: layers listed top (paid first) to bottom (loses first); losses rise from the bottom
  tranches(ctx, it) {
    const TW = it.stackW ?? 340;
    const el = place(h('div', 'tranches'), { x: it.x, y: it.y, w: it.w, h: it.h });
    let top = 0, labBottom = -Infinity;
    it.layers.forEach((ly) => {
      const hh = (ly.pct / 100) * it.h;
      const box = h('div', `trb tone-${ly.tone || 'ink'}`, `<span>${esc(ly.pctLabel ?? `${ly.pct}%`)}</span>`);
      Object.assign(box.style, { left: '0px', top: `${top}px`, width: `${TW}px`, height: `${hh - 5}px` });
      const lab = h('div', 'trl', `<b>${esc(ly.label)}</b>${ly.note ? `<em>${rich(ly.note)}</em>` : ''}`);
      const labH = ly.note ? 80 : 42, labTop = Math.max(top + hh / 2 - labH / 2, labBottom + 10); // labels never collide on thin layers
      labBottom = labTop + labH;
      Object.assign(lab.style, { left: `${TW + 34}px`, top: `${labTop}px`, width: `${it.w - TW - 34}px` });
      el.append(box, lab);
      top += hh;
      const at = ctx.T(ly.at);
      pop(ctx.tl, box, at); rise(ctx.tl, lab, at === -1 ? -1 : at + 0.15, null, 10);
    });
    const steps = it.losses || [];
    if (steps.length) {
      const loss = h('div', 'trloss'); Object.assign(loss.style, { left: '-10px', width: `${TW + 20}px`, bottom: '0px', height: '0px' });
      const tag = h('div', 'trtag'); tag.style.left = `${-10 - 26}px`; tag.dataset.baseT = 'translate(-100%, 50%)';
      el.append(loss, tag); st(tag);
      const ps = steps.map(() => 0);
      steps.forEach((sp, i) => { ctx.tl.add({ at: ctx.T(sp.at), dur: 1.3, ease: easeInOutCubic, apply: ({ p }) => { ps[i] = p; } }); });
      ctx.tl.add({ at: -1, apply: () => {
        let pct = 0, k = -1;
        steps.forEach((sp, i) => { const prev = i ? steps[i - 1].pct : 0; pct += (sp.pct - prev) * ps[i]; if (ps[i] > 0) k = i; });
        const px = (pct / 100) * it.h;
        loss.style.height = `${px.toFixed(2)}px`; loss.style.opacity = pct > 0 ? 1 : 0;
        tag.style.bottom = `${px.toFixed(2)}px`;
        tag.textContent = k >= 0 ? steps[k].label.replace('#', fmt(Math.round(pct))) : '';
        st(tag).o *= pct > 0 ? 1 : 0;
      } });
    }
    ctx.content.append(el);
  },

  // imagem do projeto (pasta midia/): logo, print de tela, foto, gráfico pronto. Ajusta sem distorcer.
  image(ctx, it) {
    const el = place(h('div', `imgbox${it.frame ? ' framed' : ''}`), it);
    const img = h('img');
    img.src = `/${String(it.src).replace(/^\/+/, '')}`;
    img.style.objectFit = it.fit || 'contain';
    el.append(img);
    if (it.caption) el.append(h('div', 'imgcap', rich(it.caption)));
    ctx.content.append(el);
    ctx.images.push(img);
    (it.pop ? pop : rise)(ctx.tl, el, ctx.T(it.at), it.out != null ? ctx.T(it.out) : null);
  },

  doc(ctx, it) {
    const el = place(h('div', 'doc'), it);
    el.append(h('div', 'dt', esc(it.title)));
    let first = Infinity;
    it.lines.forEach((ln) => {
      const row = h('div', `dr tone-${ln.tone || 'none'}`);
      row.append(h('div', 'dl', esc(ln.l)), h('div', 'dv', esc(ln.r || '')));
      if (ln.note) row.append(h('div', 'dn', esc(ln.note)));
      el.append(row);
      const at = ctx.T(ln.at); first = Math.min(first, at);
      rise(ctx.tl, row, at, null, 10);
    });
    ctx.content.append(el);
    rise(ctx.tl, el, Math.max(0, first - 0.3), null, 10);
  },
};

// ---- scene furniture ----
export function title(ctx, scene, sameAsPrev) {
  if (!scene.title) return;
  const at = sameAsPrev ? -1 : 0.1;
  let y = 92;
  if (scene.kicker) {
    const k = place(h('div', 'kicker', esc(scene.kicker)), { x: 120, y: 74, w: 1680 });
    ctx.content.append(k); rise(ctx.tl, k, at, null, 10); y = 108;
  }
  const t = place(h('div', 'title', rich(scene.title)), { x: 120, y, w: scene.layout === 'ficha' ? 1170 : 1680 });
  ctx.content.append(t); rise(ctx.tl, t, at === -1 ? -1 : at + 0.1, null, 12);
}

export function chapterCard(ctx, card) {
  const k = place(h('div', 'cardk', `Capítulo ${card.n}`), { x: 160, y: 360, w: 1600 });
  const t = place(h('div', 'cardt', rich(card.title)), { x: 160, y: 430, w: 1600 });
  const r = place(h('div', 'rule'), { x: 860, y: 690, w: 200 });
  ctx.content.append(k, t, r);
  rise(ctx.tl, k, 0.1, null, 10); rise(ctx.tl, t, 0.25, null, 18);
  ctx.tl.add({ at: 0.5, dur: 0.7, ease: easeInOutCubic, apply: ({ p }) => { r.style.transform = `scaleX(${p.toFixed(4)})`; } });
}

const slot = (scene) => (scene.layout === 'ficha' ? { x: 120, w: 1170 } : { x: 300, w: 1320 });

export function terms(ctx, scene, recapAt) {
  scene.term.forEach((tm) => {
    const el = place(h('div', 'term'), { ...slot(scene), y: 806 });
    el.append(h('div', 'tt', esc(tm.term)), h('div', 'td2', esc(tm.def)));
    ctx.content.append(el);
    const out = tm.until != null ? ctx.T(tm.until) - 0.15 : recapAt != null ? recapAt - 0.35 : null;
    rise(ctx.tl, el, ctx.T(tm.at), out, 14);
  });
}

export function recap(ctx, scene) {
  if (!scene.recap) return null;
  const at = ctx.T(scene.recap.at);
  const el = place(h('div', 'recap'), { ...slot(scene), y: 812 });
  el.append(h('div', 'rk', 'Em uma frase'), h('div', 'rt', esc(scene.recap.text)));
  ctx.content.append(el); rise(ctx.tl, el, at, null, 14);
  return at;
}

export function foot(ctx, scene) {
  if (!scene.foot) return;
  const el = place(h('div', 'foot', esc(scene.foot)), { x: 120, y: 958, w: scene.layout === 'ficha' ? 1170 : 1680 });
  ctx.content.append(el); rise(ctx.tl, el, 0.8, null, 6);
  if (el.scrollWidth > el.clientWidth + 1) throw new Error(`cena ${scene.id}: o rodapé (foot) não cabe em uma linha (${el.scrollWidth}px de ${el.clientWidth}px); encurte o texto`);
}

// Fixed slots for every ficha entry of the whole video, so nothing jumps when one is revealed.
export function ficha(ctx, root, all, before, now) {
  const panel = h('div', 'panel');
  const fp = config.ficha || {};
  panel.append(h('div', 'fk', esc(fp.titulo || 'Ficha')), h('div', 'fnum', esc(fp.nome || '')));
  const seen = new Set(before.map((e) => e.label));
  const cue = new Map(now.map((e) => [e.label, e.at]));
  const reveal = (el, label, glowEl) => {
    if (seen.has(label)) { st(el); return; }
    if (!cue.has(label)) { st(el); ctx.tl.add({ at: -1, apply: () => { st(el).o = 0; } }); return; }
    const at = ctx.T(cue.get(label));
    rise(ctx.tl, el, at, null, 8);
    ctx.tl.add({ at, dur: 1.2, ease: lin, apply: ({ p }) => { const s = st(glowEl || el); s.glow = Math.max(s.glow, Math.sin(Math.PI * p)); } });
  };
  all.filter((e) => e.kind === 'field').forEach((e) => {
    const row = h('div', 'ff'); row.append(h('div', 'fl', esc(e.label)), h('div', 'fv', esc(e.value)));
    panel.append(row); reveal(row, e.label);
  });
  panel.append(h('div', 'fk fs-h', esc(fp.carimbos || 'O que já está de pé')));
  all.filter((e) => e.kind === 'stamp').forEach((e) => {
    const slotEl = h('div', 'fs'); slotEl.append(h('div', 'box'));
    const row = h('div', 'row'); row.append(h('div', 'ck', CHECK('currentColor', 15)), h('div', 'sl', esc(e.label)));
    slotEl.append(row); panel.append(slotEl); reveal(row, e.label, row.firstChild);
  });
  root.append(panel);
  return panel;
}

export function progress(root, scene, scenes, chapters) {
  const label = scene.chapter === 0 ? chapters[0] : `Capítulo ${scene.chapter} · ${chapters[scene.chapter]}`;
  root.append(h('div', 'chap', esc(label)));
  const n = chapters.length, gap = 8, x0 = 120, w = (1680 - gap * (n - 1)) / n;
  for (let c = 0; c < n; c++) {
    const seg = h('div', `seg${c < scene.chapter ? ' done' : ''}`);
    Object.assign(seg.style, { left: `${x0 + c * (w + gap)}px`, width: `${w}px` });
    const fill = h('i');
    const inCh = scenes.filter((s) => s.chapter === c);
    const frac = c < scene.chapter ? 1 : c > scene.chapter ? 0 : (inCh.findIndex((s) => s.id === scene.id) + 1) / inCh.length;
    fill.style.width = `${(frac * 100).toFixed(1)}%`;
    seg.append(fill); root.append(seg);
  }
}
