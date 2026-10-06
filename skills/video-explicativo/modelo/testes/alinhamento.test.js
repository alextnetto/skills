import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { alignByPauses, alignProportional } from '../ferramentas/alinhamento.mjs';
import { decodePcm } from '../ferramentas/lib/audio.mjs';

// Narração real do ElevenLabs com o tempo exato de cada letra; o alinhamento por pausas tem de chegar perto.
test('alinhamento por pausas acerta o início das palavras', () => {
  const truth = JSON.parse(fs.readFileSync('testes/fixtures/c1s1.json', 'utf8'));
  const pcm = decodePcm('testes/fixtures/c1s1.mp3', 16000);
  const est = alignByPauses(truth.text, pcm, 16000), base = alignProportional(truth.text, pcm, 16000);
  const err = (al) => [...truth.text.matchAll(/\S+/g)].map((m) => Math.abs(al.starts[m.index] - truth.starts[m.index])).sort((a, b) => a - b);
  const e = err(est), b = err(base), q = (a, p) => a[Math.floor(p * (a.length - 1))];
  assert.ok(q(e, 0.5) < 0.2, `mediana ${q(e, 0.5)}`);
  assert.ok(q(e, 0.9) < 0.45, `p90 ${q(e, 0.9)}`);
  assert.ok(q(e, 0.5) < q(b, 0.5), 'melhor que o proporcional');
});
