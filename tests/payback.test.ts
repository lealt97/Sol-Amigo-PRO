import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePayback, classifyPayback } from '../src/lib/calculations/payback';

const BASE_INPUT = {
  proposalPrice: 30_000,
  kitCost: 20_000,
  tariffCentsPerKwh: 100,
  pisPercent: 0,
  cofinsPercent: 0,
  icmsPercent: 0,
  otherTariffsPercent: 0,
  monthlyCompensableConsumptionKwh: 500,
  monthlyGenerationKwh: 500,
  additionalCosts: [{ description: 'Instalação', amount: 3_000 }],
};

test('projeta fluxo de caixa, payback simples, descontado, VPL e TIR', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    analysisYears: 25,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 8,
    compensationFactorPercent: 100,
  });

  assert.equal(result.simplePaybackYears, 5);
  assert.ok(result.discountedPaybackYears > result.simplePaybackYears);
  assert.ok(result.netPresentValue > 0);
  assert.ok((result.internalRateOfReturnPercent ?? 0) > 0);
  assert.equal(result.chartData.length, 26);
  assert.equal(result.chartData[0]?.cumulativeBalance, -30_000);
  assert.equal(result.chartData[5]?.cumulativeBalance, 0);
  assert.equal(result.hasCostBasis, true);
  assert.equal(result.directCost, 23_000);
  assert.equal(result.profitAmount, 7_000);
  assert.equal(result.marginPercentage, 23.33);
});

test('aplica degradação, reajuste tarifário, O&M e troca do inversor por ano', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    analysisYears: 10,
    annualTariffEscalationPercent: 5,
    annualGenerationDegradationPercent: 0.5,
    annualOperationMaintenancePercent: 1,
    discountRatePercent: 8,
    compensationFactorPercent: 90,
    inverterReplacementYear: 5,
    inverterReplacementCost: 4_000,
  });

  assert.equal(result.totalOperationMaintenanceCost, 3_000);
  assert.equal(result.totalReplacementCost, 4_000);
  assert.equal(result.chartData[5]?.replacementCost, 4_000);
  assert.ok(result.lastYearGenerationKwh < result.firstYearGenerationKwh);
  assert.ok(result.chartData[2]!.tariffPerKwh > result.chartData[1]!.tariffPerKwh);
  assert.equal(result.compensationFactorPercent, 90);
});

test('calcula payback sem kit e mantém rentabilidade interna indisponível', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    kitCost: null,
    additionalCosts: [],
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.hasCostBasis, false);
  assert.equal(result.totalInvestment, 30_000);
  assert.equal(result.profitAmount, 0);
  assert.equal(result.marginPercentage, 0);
  assert.equal(result.simplePaybackYears, result.discountedPaybackYears);
});

test('limita a economia ao fator de compensação informado', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    proposalPrice: 10_000,
    kitCost: null,
    additionalCosts: [],
    compensationFactorPercent: 80,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.compensatedEnergyKwhPerMonth, 400);
  assert.equal(result.monthlySavings, 400);
});

test('compara a fatura média com economia do primeiro ano', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    averageMonthlyBillAmount: 610,
    monthlyAvailabilityConsumptionKwh: 30,
    monthlyCompensableConsumptionKwh: 470,
    monthlyGenerationKwh: 400,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.estimatedEnergyBillAmount, 500);
  assert.equal(result.estimatedResidualBillAmount, 210);
  assert.equal(result.estimatedBillReductionPercent, 65.57);
  assert.equal(result.billReferenceStatus, 'consistent');
});

test('classifica os intervalos de retorno', () => {
  assert.equal(classifyPayback(3), 'excellent');
  assert.equal(classifyPayback(5), 'very_good');
  assert.equal(classifyPayback(7), 'good');
  assert.equal(classifyPayback(10), 'regular');
  assert.equal(classifyPayback(10.01), 'unfeasible');
  assert.equal(classifyPayback(Number.POSITIVE_INFINITY), 'unfeasible');
});


test('calcula lucro e margem usando custo manual quando não há kit', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    proposalPrice: 20_000,
    kitCost: null,
    manualSystemCost: 12_000,
    additionalCosts: [{ description: 'Instalação', amount: 2_000 }],
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.hasCostBasis, true);
  assert.equal(result.baseSystemCost, 12_000);
  assert.equal(result.directCost, 14_000);
  assert.equal(result.profitAmount, 6_000);
  assert.equal(result.marginPercentage, 30);
});
