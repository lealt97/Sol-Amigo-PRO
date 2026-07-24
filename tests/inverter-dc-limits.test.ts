import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateInverterDcLimits } from '../src/lib/calculations/inverterDcLimits';

const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('aceita oversizing acima de 20% quando está dentro da relação máxima do fabricante', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 6.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: null,
    maxDcAcRatio: 1.5,
  });

  assert.equal(result.status, 'within_manufacturer_limit');
  assert.equal(result.maxByRatioKwp, 7.5);
  assert.equal(result.effectiveMaxDcPowerKwp, 7.5);
});

test('bloqueia somente quando ultrapassa o limite cadastrado do fabricante', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 7.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: null,
    maxDcAcRatio: 1.5,
  });

  assert.equal(result.status, 'above_manufacturer_limit');
  assert.match(result.guidance, /ultrapassa o limite efetivo/i);
});

test('respeita a potência FV máxima explícita do datasheet', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 6.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: 6.5,
    maxDcAcRatio: 1.5,
  });

  assert.equal(result.status, 'above_manufacturer_limit');
  assert.equal(result.effectiveMaxDcPowerKwp, 6.5);
});

test('mantém validação documental pendente quando o limite não foi cadastrado', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 6.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: null,
    maxDcAcRatio: null,
  });

  assert.equal(result.status, 'documentation_pending');
  assert.equal(result.effectiveMaxDcPowerKwp, null);
});

test('catálogo coleta limites e proposta trata 1,20 apenas como referência informativa', async () => {
  const [catalog, calculator] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(catalog, /Potência FV máxima kWp/);
  assert.match(catalog, /Relação DC\/AC máxima/);
  assert.match(calculator, /A referência de 1,20 é apenas comparativa/);
  assert.match(calculator, /above_manufacturer_limit/);
  assert.match(calculator, /O kit ultrapassa o limite DC cadastrado para o inversor/);
});
