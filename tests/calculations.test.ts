import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcularConsumoMedio12Meses,
  calcularSistemaSolar,
} from '../src/lib/calculations/solar';
import { calcularPrecoProposta } from '../src/lib/calculations/pricing';
import { calcularPayback, classificarPayback } from '../src/lib/calculations/payback';
import {
  calcularConsumoDiarioTotal,
  calcularConsumoMensalEstimado,
} from '../src/lib/calculations/loadSurvey';

function assertApproximately(actual: number, expected: number, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Esperado ${expected}, recebido ${actual}`,
  );
}

test('calcula a média usando somente os meses realmente informados', () => {
  assert.equal(calcularConsumoMedio12Meses([300, 450, 600]), 450);
  assert.equal(calcularConsumoMedio12Meses([]), 0);
  assert.equal(calcularConsumoMedio12Meses([300, Number.NaN, -20, 500]), 400);
});

test('dimensiona um sistema fotovoltaico completo', () => {
  const resultado = calcularSistemaSolar({
    hsp: 5,
    panel_power_w: 600,
    yield_factor: 0.8,
    generation_target_percent: 100,
    oversizing: 1.2,
    monthly_consumption_kwh: 600,
    energy_tariff: 1,
  });

  assert.ok(resultado);
  assertApproximately(resultado.required_power_kwp, 5);
  assert.equal(resultado.panel_count, 9);
  assertApproximately(resultado.installed_power_kwp, 5.4);
  assertApproximately(resultado.estimated_monthly_generation_kwh, 648);
  assertApproximately(resultado.excess_kwh, 48);
  assertApproximately(resultado.excess_percentage, 0.08);
  assertApproximately(resultado.min_inverter_power_kw, 4.5);
  assertApproximately(resultado.monthly_savings, 600);
  assertApproximately(resultado.annual_savings, 7200);
});

test('não dimensiona sistema sem parâmetros técnicos essenciais', () => {
  const resultado = calcularSistemaSolar({
    hsp: 0,
    panel_power_w: 600,
    yield_factor: 0.8,
    generation_target_percent: 100,
    oversizing: 1.2,
    monthly_consumption_kwh: 600,
    energy_tariff: 1,
  });

  assert.equal(resultado, null);
});

test('calcula preço, desconto, lucro, margem e markup', () => {
  const resultado = calcularPrecoProposta({
    kit_cost: 7000,
    labor_cost: 2000,
    fixed_costs: 500,
    freight_cost: 300,
    taxes: 100,
    commission: 100,
    other_costs: 0,
    margin_percentage: 20,
    discount_percentage: 10,
  });

  assertApproximately(resultado.total_cost, 10000);
  assertApproximately(resultado.gross_price, 12500);
  assertApproximately(resultado.discount_value, 1250);
  assertApproximately(resultado.final_price, 11250);
  assertApproximately(resultado.estimated_profit, 1250);
  assertApproximately(resultado.real_margin_percentage, 11.11111111111111);
  assertApproximately(resultado.markup_percentage, 12.5);
});

test('calcula payback e classificação de viabilidade', () => {
  const resultado = calcularPayback({
    investimentoTotal: 30000,
    economiaMensal: 500,
    economiaAnual: 6000,
  });

  assert.ok(resultado);
  assert.equal(resultado.paybackAnos, 5);
  assert.equal(resultado.paybackMeses, 0);
  assert.equal(resultado.paybackFormatado, '5 anos');
  assert.equal(resultado.viability.status, 'good');
  assert.equal(resultado.tabelaRetorno.length, 26);
  assert.equal(resultado.economiaLiquida25Anos, 120000);

  assert.equal(classificarPayback(2.5).status, 'excellent');
  assert.equal(classificarPayback(7).status, 'regular');
  assert.equal(classificarPayback(9).status, 'not_viable');
});

test('rejeita payback sem investimento ou economia anual', () => {
  assert.equal(
    calcularPayback({ investimentoTotal: 0, economiaMensal: 500, economiaAnual: 6000 }),
    null,
  );
  assert.equal(
    calcularPayback({ investimentoTotal: 30000, economiaMensal: 0, economiaAnual: 0 }),
    null,
  );
});

test('calcula o levantamento de cargas diário e mensal', () => {
  const consumoDiario = calcularConsumoDiarioTotal([
    {
      equipment_name: 'Ar-condicionado',
      power_watts: 1000,
      quantity: 2,
      hours_per_day: 5,
    },
    {
      equipment_name: 'Iluminação',
      power_watts: 100,
      quantity: 10,
      hours_per_day: 4,
    },
  ]);

  assertApproximately(consumoDiario, 14);
  assertApproximately(calcularConsumoMensalEstimado(consumoDiario), 420);
});
