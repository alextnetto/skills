import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('o roteiro passa na validação', () => {
  const out = execFileSync(process.execPath, ['ferramentas/validar.mjs'], { encoding: 'utf8' });
  assert.match(out, /Roteiro válido/);
});
