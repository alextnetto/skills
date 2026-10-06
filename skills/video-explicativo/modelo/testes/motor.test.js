import test from 'node:test';
import assert from 'node:assert/strict';
import { cueTime, Timeline, easeOutCubic, clamp01 } from '../motor/engine.js';

const text = 'A nota de remessa vai, a nota de retorno volta.';
const align = { id: 't', text, starts: [...text].map((_, i) => i * 0.1), ends: [...text].map((_, i) => i * 0.1 + 0.1) };

test('gatilhos numéricos', () => {
  assert.equal(cueTime(align, 1.5), 1.5);
  assert.equal(cueTime(align, -1), -1);
  assert.ok(Math.abs(cueTime(align, '0.3+0.25') - 0.55) < 1e-9);
});
test('gatilho por frase com atraso, ocorrência e deslocamento', () => {
  assert.ok(Math.abs(cueTime(align, '@nota', 0.3) - (0.3 + 0.2)) < 1e-9);
  assert.ok(Math.abs(cueTime(align, '@nota#2', 0.3) - (0.3 + text.indexOf('nota', 5) * 0.1)) < 1e-9);
  assert.ok(Math.abs(cueTime(align, '@Remessa+0.5') - (text.indexOf('remessa') * 0.1 + 0.5)) < 1e-9);
});
test('frase inexistente gera erro', () => {
  assert.throws(() => cueTime(align, '@boleto'), /não aparece/);
  assert.throws(() => cueTime(align, '@nota#3'), /não aparece/);
});
test('seek é função pura do tempo', () => {
  const tl = new Timeline(); const seen = [];
  tl.add({ at: 1, apply: ({ p }) => seen.push(p) });
  tl.add({ at: -1, out: 2, apply: () => {} });
  const a = tl.seek(1.2); const b = tl.seek(2.1); const a2 = tl.seek(1.2);
  assert.equal(a, a2); assert.notEqual(a, b);
  assert.equal(easeOutCubic(clamp01(5)), 1);
});
