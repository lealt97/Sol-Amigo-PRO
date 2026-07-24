import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('entrada manual de média não calcula com valores parciais e aceita formato brasileiro', async () => {
  const source = await readFile(CALCULATOR, 'utf8');

  assert.match(source, /committedDirectAverageConsumption/);
  assert.match(source, /parseConsumptionKwhInput\(committedDirectAverageConsumption\)/);
  assert.match(source, /monthlyConsumption\.map\(parseConsumptionKwhInput\)/);
  assert.match(source, /setCommittedDirectAverageConsumption\(''\)/);
  assert.match(source, /onBlur=\{\(\) => setCommittedDirectAverageConsumption\(directAverageConsumption\)\}/);
  assert.match(source, /type="text"[\s\S]*inputMode="decimal"/);
  assert.match(source, /setCommittedDirectAverageConsumption\(clientAverage\)/);
});
