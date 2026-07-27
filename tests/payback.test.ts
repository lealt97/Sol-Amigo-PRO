import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePayback, classifyPayback } from '../src/lib/calculations/payback';

test('calcula investimento, economia e payback com margem sobre o preço de venda', () => {
  const result = calculatePayback({
    kitCost: 20_000,
    marginPercentage: 20,
    tariffCentsPerKwh: 100,
    pisPercent: 2,
    cofinsPercent: 3,
    icmsPercent: 5,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 600,
    monthlyGenerationKwh: 500,
    additionalCosts: [
      { description: 'Instalação', amount: 3_000 },
      { description: 'Homologação', amount: 2_000 },
    ],
  });

  assert.equal(result.additionalCostsTotal, 5_000);
  assert.equal(result.directCost, 25_000);
  assert.equal(result.totalInvestment, 31_250);
  assert.equal(result.profitAmount, 6_250);
  assert.equal(result.effectiveTariffPerKwh, 1.1);
  assert.equal(result.compensatedEnergyKwhPerMonth, 500);
  assert.equal(result.monthlySavings, 550);
  assert.equal(result.annualSavings, 6_600);
  assert.equal(result.paybackYears, 4.73);
  assert.equal(result.paybackMonths, 57);
  assert.equal(result.status, 'very_good');
  assert.equal(result.statusLabel, 'Muito bom');
  assert.equal(result.chartData[0]?.cumulativeBalance, -31_250);
  assert.equal(result.chartData[5]?.cumulativeBalance, 1_750);
  assert.equal(result.chartData.length, 26);
});

test('limita a economia à energia que pode ser compensada', () => {
  const result = calculatePayback({
    kitCost: 10_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 300,
    monthlyGenerationKwh: 500,
    additionalCosts: [],
  });

  assert.equal(result.compensatedEnergyKwhPerMonth, 300);
  assert.equal(result.monthlySavings, 300);
});

test('classifica os intervalos de retorno', () => {
  assert.equal(classifyPayback(3), 'excellent');
  assert.equal(classifyPayback(5), 'very_good');
  assert.equal(classifyPayback(7), 'good');
  assert.equal(classifyPayback(10), 'regular');
  assert.equal(classifyPayback(10.01), 'unfeasible');
  assert.equal(classifyPayback(Number.POSITIVE_INFINITY), 'unfeasible');
});

test('rejeita margem de lucro igual ou superior a 100%', () => {
  assert.throws(
    () => calculatePayback({
      kitCost: 20_000,
      marginPercentage: 100,
      tariffCentsPerKwh: 100,
      pisPercent: 0,
      cofinsPercent: 0,
      icmsPercent: 0,
      otherTariffsPercent: 0,
      monthlyCompensableConsumptionKwh: 500,
      monthlyGenerationKwh: 500,
      additionalCosts: [],
    }),
    /menor que 100%/,
  );
});


test('compara a fatura média com a tarifa e calcula a fatura residual', () => {
  const result = calculatePayback({
    kitCost: 10_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    averageMonthlyBillAmount: 610,
    monthlyAvailabilityConsumptionKwh: 30,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 470,
    monthlyGenerationKwh: 400,
    additionalCosts: [],
  });

  assert.equal(result.estimatedEnergyBillAmount, 500);
  assert.equal(result.averageMonthlyBillAmount, 610);
  assert.equal(result.estimatedResidualBillAmount, 210);
  assert.equal(result.estimatedBillReductionPercent, 65.57);
  assert.equal(result.billReferenceDifferencePercent, 18.03);
  assert.equal(result.billReferenceStatus, 'consistent');
});

test('sinaliza revisão quando a fatura diverge mais de vinte por cento', () => {
  const result = calculatePayback({
    kitCost: 10_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    averageMonthlyBillAmount: 800,
    monthlyAvailabilityConsumptionKwh: 30,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 470,
    monthlyGenerationKwh: 400,
    additionalCosts: [],
  });

  assert.equal(result.estimatedResidualBillAmount, 400);
  assert.equal(result.estimatedBillReductionPercent, 50);
  assert.equal(result.billReferenceDifferencePercent, 37.5);
  assert.equal(result.billReferenceStatus, 'review');
});

test('mantém a comparação opcional quando a fatura não é informada', () => {
  const result = calculatePayback({
    kitCost: 10_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 300,
    monthlyGenerationKwh: 300,
    additionalCosts: [],
  });

  assert.equal(result.averageMonthlyBillAmount, null);
  assert.equal(result.estimatedResidualBillAmount, null);
  assert.equal(result.estimatedBillReductionPercent, null);
  assert.equal(result.billReferenceStatus, 'not_informed');
});
