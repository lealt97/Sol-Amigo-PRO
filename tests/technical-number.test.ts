import assert from 'node:assert/strict';
import test from 'node:test';
import { technicalNumber } from '../src/lib/formatters/technicalNumber';

test('remove casas decimais de valores técnicos com quatro ou mais dígitos', () => {
  assert.equal(technicalNumber.format(1904.143), '1.904');
  assert.equal(technicalNumber.format(4481.743), '4.482');
});

test('mantém precisão de até três casas para valores abaixo de mil', () => {
  assert.equal(technicalNumber.format(373.479), '373,479');
  assert.equal(technicalNumber.format(4.407), '4,407');
  assert.equal(technicalNumber.format(4.556), '4,556');
});

test('usa marcador neutro para valores inválidos', () => {
  assert.equal(technicalNumber.format(Number.NaN), '—');
});
