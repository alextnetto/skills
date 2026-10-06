// Deterministic animation core. Everything on screen is a pure function of scene time t (seconds).
// No CSS transitions, no wall clock: seek(a); seek(b); seek(a) must give the same frame.

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeOutCubic = (p) => 1 - (1 - p) ** 3;
export const easeInOutCubic = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
export const easeOutBack = (p) => { const c = 1.4; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; };

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// spec: number | "1.2+0.3" | "@frase" | "@frase#2" | "@frase+0.4" | "@frase#2+0.4"
// -1 means "already on screen when the scene starts".
export function cueTime(align, spec, lead = 0) {
  if (typeof spec === 'number') return spec;
  if (!spec.startsWith('@')) {
    const v = spec.split('+').reduce((n, x) => n + parseFloat(x), 0);
    if (Number.isNaN(v)) throw new Error(`tempo inválido "${spec}" (use um número, "1.2+0.3" ou "@frase")`);
    return spec.startsWith('-1') ? -1 : v;
  }
  const m = spec.match(/^@(.+?)(?:#(\d+))?(?:\+([\d.]+))?$/);
  const phrase = fold(m[1]);
  const nth = m[2] ? parseInt(m[2], 10) : 1;
  const delta = m[3] ? parseFloat(m[3]) : 0;
  const hay = fold(align.text);
  if (hay.length !== align.text.length) throw new Error('o texto normalizado mudou de tamanho; a busca de frases sairia do lugar');
  let idx = -1;
  for (let k = 0; k < nth; k++) {
    idx = hay.indexOf(phrase, idx + 1);
    if (idx < 0) throw new Error(`cena ${align.id}: a frase "${m[1]}" (gatilho "${spec}") não aparece na fala. Copie um trecho exato da fala falada (sem acento e em minúsculas também vale).`);
  }
  return lead + align.starts[idx] + delta;
}

// An item: { at, dur?, out?, outDur?, ease?, apply({p, vis, t}) }
//   p   = eased entrance progress 0..1 (1 when at === -1)
//   vis = 1 until `out`, then fades to 0
export class Timeline {
  constructor() { this.items = []; this.sig = []; }
  add(item) { this.items.push({ dur: 0.5, outDur: 0.3, ease: easeOutCubic, ...item }); return item; }
  seek(t) {
    this.sig.length = 0;
    for (const it of this.items) {
      const raw = it.at === -1 ? 1 : clamp01((t - it.at) / it.dur);
      const p = it.ease(raw);
      const vis = it.out == null ? 1 : 1 - clamp01((t - it.out) / it.outDur);
      this.sig.push(Math.round(p * 1000), Math.round(vis * 1000));
      it.apply({ p, raw, vis, t });
    }
    return this.sig.join(',');
  }
  lastCue() { return this.items.reduce((m, it) => Math.max(m, it.at + (it.at === -1 ? 0 : it.dur)), 0); }
}

export const fmt = (n, decimals = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
