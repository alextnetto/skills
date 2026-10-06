// Narration markup: "{tela|fala}" keeps what is shown (captions) apart from what is spoken (TTS).
// Example: "A {NFS-e|ene efe esse é} nacional" -> display "A NFS-e nacional", spoken "A ene efe esse é nacional".

const RE = /\{([^{}|]*)\|([^{}|]*)\}/g;

export function segments(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    if (m.index > last) {
      const plain = text.slice(last, m.index);
      out.push({ display: plain, spoken: plain, marked: false });
    }
    out.push({ display: m[1], spoken: m[2], marked: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const plain = text.slice(last);
    out.push({ display: plain, spoken: plain, marked: false });
  }
  return out;
}

export const spoken = (text) => segments(text).map((s) => s.spoken).join('');
export const display = (text) => segments(text).map((s) => s.display).join('');

// Display words with the [start, end) character range each one covers in the spoken string.
// A marked piece maps all of its display words onto the whole spoken replacement.
export function displayWords(text) {
  const words = [];
  let pos = 0;
  for (const seg of segments(text)) {
    if (seg.marked) {
      const parts = seg.display.split(/\s+/).filter(Boolean);
      parts.forEach((w) => words.push({ word: w, start: pos, end: pos + seg.spoken.length, glue: false }));
    } else {
      for (const m of seg.spoken.matchAll(/\S+/g)) {
        words.push({ word: m[0], start: pos + m.index, end: pos + m.index + m[0].length, glue: false });
      }
      // punctuation stuck to a previous marked piece ("{NFS-e|…}," ) must glue to it
      if (words.length && /^\S/.test(seg.spoken) && pos > 0) {
        const first = seg.spoken.match(/^\S+/)[0];
        if (/^[.,;:!?)]+$/.test(first)) {
          const idx = words.findIndex((w) => w.start === pos);
          if (idx > 0) {
            words[idx - 1].word += first;
            words[idx - 1].end = words[idx].end;
            words.splice(idx, 1);
          }
        }
      }
    }
    pos += seg.spoken.length;
  }
  return words;
}

export const fold = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
