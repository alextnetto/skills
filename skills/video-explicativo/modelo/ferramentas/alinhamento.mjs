// Alinhamento estimado para vozes que não informam o tempo de cada letra (OpenAI, Gemini, voz do computador).
// Ideia: as pausas do áudio caem na pontuação do texto. Uma programação dinâmica escolhe quais pausas
// correspondem a quais sinais de pontuação, em ordem, exigindo que a velocidade da fala entre dois pontos
// casados fique perto da velocidade média da cena. Entre os pontos casados, o tempo é interpolado letra a letra.
// Saída no mesmo formato do ElevenLabs: tempo de início e fim de cada caractere do texto falado.

const FRAME = 0.01; // 10 ms

// Energia por quadro de 10 ms, em dB.
export function frameLevels(pcm, sr) {
  const n = Math.round(sr * FRAME), out = new Float64Array(Math.floor(pcm.length / n));
  for (let f = 0; f < out.length; f++) {
    let s = 0;
    for (let i = f * n; i < (f + 1) * n; i++) s += pcm[i] * pcm[i];
    out[f] = 10 * Math.log10(s / n / (32768 * 32768) + 1e-12);
  }
  return out;
}

// Limiar de silêncio local: o ruído de fundo de uma voz sintética pode subir ao longo da cena,
// então o limiar acompanha o piso e o pico de uma janela de 5 segundos em volta de cada quadro.
function localThresholds(levels, half = 250, step = 25) {
  const n = levels.length, thr = new Float64Array(n);
  const knots = [];
  for (let c = 0; c < n + step; c += step) {
    const mid = Math.min(n - 1, c), lo = Math.max(0, mid - half), hi = Math.min(n, mid + half);
    const w = Array.prototype.slice.call(levels, lo, hi).sort((a, b) => a - b);
    const floor = w[Math.floor(0.08 * (w.length - 1))], loud = w[Math.floor(0.92 * (w.length - 1))];
    knots.push(floor + Math.max(6, 0.3 * (loud - floor)));
  }
  for (let f = 0; f < n; f++) {
    const k = Math.floor(f / step), r = (f % step) / step;
    thr[f] = knots[k] + r * ((knots[k + 1] ?? knots[k]) - knots[k]);
  }
  return thr;
}

// Início e fim da fala e as pausas internas (trechos de silêncio de pelo menos minPause segundos).
export function findPauses(levels, minPause = 0.15) {
  const thr = localThresholds(levels);
  let first = -1, last = -1;
  for (let f = 0; f < levels.length; f++) if (levels[f] > thr[f]) { if (first < 0) first = f; last = f; }
  if (first < 0) return { s0: 0, s1: levels.length * FRAME, pauses: [] };
  const pauses = [];
  let run = -1;
  for (let f = first; f <= last + 1; f++) {
    const quiet = f <= last && levels[f] <= thr[f];
    if (quiet && run < 0) run = f;
    if (!quiet && run >= 0) {
      const len = (f - run) * FRAME;
      if (len >= minPause) pauses.push({ start: run * FRAME, end: f * FRAME, len });
      run = -1;
    }
  }
  return { s0: first * FRAME, s1: (last + 1) * FRAME, pauses };
}

// Pontos do texto onde se espera uma pausa: o último sinal de pontuação (p) e o começo da palavra seguinte (q).
export function textAnchors(text) {
  const out = [];
  for (const m of text.matchAll(/([.,;:!?…]+)["”’')\]]*(\s+)(?=\S)/g)) {
    const p = m.index + m[1].length - 1, q = m.index + m[0].length;
    const strength = /[.!?…]/.test(m[1]) ? 3 : /[;:]/.test(m[1]) ? 2 : 1;
    out.push({ p, q, strength });
  }
  return out;
}

// "Tamanho falado" acumulado do texto: letras valem 1, espaços valem menos.
function unitsOf(text) {
  const u = new Float64Array(text.length + 1);
  for (let i = 0; i < text.length; i++) u[i + 1] = u[i] + (/\s/.test(text[i]) ? 0.6 : /[.,;:!?…"”’')\]]/.test(text[i]) ? 0.3 : 1);
  return u;
}

// Tempo de cada posição do texto, interpolado entre nós {i, t} em ordem.
function interpolate(units, knots) {
  const at = new Float64Array(units.length);
  let k = 0;
  for (let i = 0; i < units.length; i++) {
    while (k < knots.length - 2 && i > knots[k + 1].i) k++;
    const a = knots[k], b = knots[k + 1];
    const span = units[b.i] - units[a.i];
    at[i] = span > 0 ? a.t + ((Math.min(units[i], units[b.i]) - units[a.i]) / span) * (b.t - a.t) : a.t;
  }
  return at;
}

const SKIP_ANCHOR = { 1: 0.15, 2: 0.45, 3: 0.9 };
const REWARD = { 1: 0.5, 2: 0.8, 3: 1.0 };

// Escolhe os pares (pontuação, pausa) que melhor explicam o áudio.
function chain(anchors, pauses, units, s0, s1, firstChar, lastChar, rate) {
  const n = anchors.length, m = pauses.length;
  // Soma do tamanho das pausas antes do índice j (para descontar pausas não casadas de um trecho).
  const pLen = new Float64Array(m + 1);
  for (let j = 0; j < m; j++) pLen[j + 1] = pLen[j] + pauses[j].len;
  const aSkip = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) aSkip[i + 1] = aSkip[i] + SKIP_ANCHOR[anchors[i].strength];
  const pSkip = new Float64Array(m + 1);
  for (let j = 0; j < m; j++) pSkip[j + 1] = pSkip[j] + 0.1 + 0.9 * Math.min(1, pauses[j].len / 0.4);

  // Custo de velocidade de um trecho de fala: desvio (em log) entre a duração real e a esperada.
  const segCost = (uFrom, tFrom, uTo, tTo, jFrom, jTo) => {
    const u = uTo - uFrom;
    if (u <= 0) return tTo - tFrom > 0.05 ? 50 : 0;
    const actual = tTo - tFrom - (pLen[jTo] - pLen[jFrom]);
    if (actual <= 0.02) return 50;
    const d = Math.log(actual / (u / rate));
    const sigma = 0.1 + 1.6 / Math.sqrt(u);
    return (d / sigma) ** 2 * 0.5;
  };
  const node = (a, p) => {
    const ideal = a.strength === 3 ? 0.45 : a.strength === 2 ? 0.35 : 0.2;
    const fit = Math.exp(-0.5 * (Math.log(p.len / ideal) / 0.9) ** 2);
    return REWARD[a.strength] * (0.6 + 0.4 * fit);
  };

  // best[i][j]: melhor pontuação com o par (âncora i, pausa j) como último casado. -1 = início.
  const best = Array.from({ length: n }, () => new Float64Array(m).fill(-Infinity));
  const from = Array.from({ length: n }, () => new Int32Array(m).fill(-2));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const a = anchors[i], p = pauses[j], gain = node(a, p);
      // a partir do início
      let v = -segCost(units[firstChar], s0, units[a.p + 1], p.start, 0, j) - aSkip[i] - pSkip[j] + gain;
      let arg = -1;
      for (let i2 = 0; i2 < i; i2++) {
        for (let j2 = 0; j2 < j; j2++) {
          const prev = best[i2][j2];
          if (prev === -Infinity) continue;
          const a2 = anchors[i2], p2 = pauses[j2];
          const w = prev - segCost(units[a2.q], p2.end, units[a.p + 1], p.start, j2 + 1, j)
            - (aSkip[i] - aSkip[i2 + 1]) - (pSkip[j] - pSkip[j2 + 1]) + gain;
          if (w > v) { v = w; arg = i2 * m + j2; }
        }
      }
      best[i][j] = v; from[i][j] = arg;
    }
  }
  // fechamento até o fim da fala
  let top = -segCost(units[firstChar], s0, units[lastChar], s1, 0, m) - aSkip[n] - pSkip[m], last = -1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (best[i][j] === -Infinity) continue;
      const a = anchors[i], p = pauses[j];
      const w = best[i][j] - segCost(units[a.q], p.end, units[lastChar], s1, j + 1, m) - (aSkip[n] - aSkip[i + 1]) - (pSkip[m] - pSkip[j + 1]);
      if (w > top) { top = w; last = i * m + j; }
    }
  }
  const pairs = [];
  for (let k = last; k >= 0;) {
    const i = Math.floor(k / m), j = k % m;
    pairs.push([anchors[i], pauses[j]]);
    k = from[i][j];
  }
  return pairs.reverse();
}

// Pausas sem pontuação (respiração no meio da frase) caem entre palavras: encaixa cada uma no espaço
// entre palavras mais provável, para a interpolação não espalhar esse silêncio pelas letras vizinhas.
function withInnerPauses(text, units, knots, free) {
  const out = [];
  for (let k = 0; k < knots.length - 1; k++) {
    const A = knots[k], B = knots[k + 1];
    out.push(A);
    const inner = free.filter((p) => p.start > A.t + 0.05 && p.end < B.t - 0.05);
    if (!inner.length || B.i - A.i < 4) continue;
    const speech = B.t - A.t - inner.reduce((n, p) => n + p.len, 0);
    if (speech <= 0) continue;
    let before = 0, lastI = A.i;
    for (const p of inner) {
      const target = units[A.i] + ((p.start - A.t - before) / speech) * (units[B.i] - units[A.i]);
      before += p.len;
      let best = -1;
      for (let i = lastI + 1; i < B.i - 1; i++) {
        if (text[i] === ' ' && text[i + 1] !== ' ' && (best < 0 || Math.abs(units[i] - target) < Math.abs(units[best] - target))) best = i;
      }
      if (best < 0 || Math.abs(units[best] - target) > 12) continue; // longe demais de um espaço: ignora
      out.push({ i: best, t: p.start }, { i: best + 1, t: p.end });
      lastI = best + 1;
    }
  }
  out.push(knots[knots.length - 1]);
  return out;
}

// text: texto falado; pcm: Int16Array mono; sr: taxa de amostragem.
export function alignByPauses(text, pcm, sr) {
  const levels = frameLevels(pcm, sr);
  const { s0, s1, pauses } = findPauses(levels);
  const anchors = textAnchors(text);
  const units = unitsOf(text);
  const firstChar = Math.max(0, text.search(/\S/)), lastChar = text.length;
  const speech = s1 - s0 - pauses.reduce((n, p) => n + p.len, 0);
  let rate = (units[lastChar] - units[firstChar]) / Math.max(0.5, speech);
  let pairs = chain(anchors, pauses, units, s0, s1, firstChar, lastChar, rate);
  // segunda volta com a velocidade medida só nos trechos casados (pausas não casadas contam como fala)
  const matched = pairs.reduce((n, [, p]) => n + p.len, 0);
  rate = (units[lastChar] - units[firstChar]) / Math.max(0.5, s1 - s0 - matched);
  pairs = chain(anchors, pauses, units, s0, s1, firstChar, lastChar, rate);

  const knots = [{ i: firstChar, t: s0 }, ...pairs.flatMap(([a, p]) => [{ i: a.p + 1, t: p.start }, { i: a.q, t: p.end }]), { i: lastChar, t: s1 }];
  const used = new Set(pairs.map(([, p]) => p));
  const at = interpolate(units, withInnerPauses(text, units, knots, pauses.filter((p) => !used.has(p))));
  const starts = [], ends = [];
  for (let i = 0; i < text.length; i++) { starts.push(+at[i].toFixed(3)); ends.push(+at[i + 1].toFixed(3)); }
  return { starts, ends, duration: levels.length * FRAME, anchors: pairs.length, pauses: pauses.length };
}

// Referência ingênua (sem pausas): tempo proporcional ao número de letras. Usada só nos testes.
export function alignProportional(text, pcm, sr) {
  const { s0, s1 } = findPauses(frameLevels(pcm, sr));
  const units = unitsOf(text);
  const at = interpolate(units, [{ i: 0, t: s0 }, { i: text.length, t: s1 }]);
  return { starts: [...at].slice(0, text.length), ends: [...at].slice(1) };
}
