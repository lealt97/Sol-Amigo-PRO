import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { technicalNumber } from '../src/lib/formatters/technicalNumber';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('trunca potência em duas casas sem alterar o valor calculado', () => {
  assert.equal(technicalNumber.formatTruncated(4.556, 2), '4,55');
  assert.equal(technicalNumber.formatTruncated(4.559, 2), '4,55');
  assert.equal(technicalNumber.formatTruncated(4.5, 2), '4,5');
  assert.equal(technicalNumber.formatTruncated(-4.556, 2), '-4,55');
  assert.equal(technicalNumber.format(4.556), '4,556');
});

test('potências da calculadora usam truncamento visual de duas casas', async () => {
  const source = await readFile(CALCULATOR, 'utf8');

  assert.match(source, /formatTruncated\(result\.requiredPowerKwp, 2\)/);
  assert.match(source, /formatTruncated\(\(moduleQuantity \* parseNumber\(modulePowerW\)\) \/ 1000, 2\)/);
  assert.match(source, /formatTruncated\(selectedKit\.kit_power_kwp, 2\)/);
  assert.match(source, /formatTruncated\(selectedKitOversizing\.dcPowerKwp, 2\)/);
});
