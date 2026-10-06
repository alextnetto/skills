// Stage is 1920x1080. Content zone y 240..780; slot zone (term card / recap) y 800..920; foot y 960.
export const FULL = { x: 120, y: 240, w: 1680, h: 540 };
export const FICHA = { x: 120, y: 240, w: 1170, h: 540 };

// n equal columns inside an area
export function cols(n, area, gap = 40) {
  const w = (area.w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: Math.round(area.x + i * (w + gap)), w: Math.round(w) }));
}
