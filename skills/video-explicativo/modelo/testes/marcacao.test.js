import test from 'node:test';
import assert from 'node:assert/strict';
import { spoken, display, segments, displayWords } from '../motor/marcacao.js';

test('plain text is unchanged', () => {
  assert.equal(spoken('um contrato simples'), 'um contrato simples');
  assert.equal(display('um contrato simples'), 'um contrato simples');
});

test('marked piece splits display and spoken', () => {
  const t = 'A {NFS-e|ene efe esse é} nacional';
  assert.equal(display(t), 'A NFS-e nacional');
  assert.equal(spoken(t), 'A ene efe esse é nacional');
  assert.equal(segments(t).length, 3);
});

test('several marks in one sentence', () => {
  const t = 'Em {01/12/2026|primeiro de dezembro}, o {IBS|i bê esse} entra.';
  assert.equal(display(t), 'Em 01/12/2026, o IBS entra.');
  assert.equal(spoken(t), 'Em primeiro de dezembro, o i bê esse entra.');
});

test('displayWords maps onto spoken ranges and glues punctuation', () => {
  const t = 'Em {01/12/2026|primeiro de dezembro}, o {IBS|i bê esse} entra.';
  const sp = spoken(t);
  const w = displayWords(t);
  assert.deepEqual(w.map((x) => x.word), ['Em', '01/12/2026,', 'o', 'IBS', 'entra.']);
  assert.equal(sp.slice(w[1].start, w[1].end), 'primeiro de dezembro,');
  assert.equal(sp.slice(w[3].start, w[3].end), 'i bê esse');
  for (const x of w) assert.ok(x.start < x.end && x.end <= sp.length);
});
