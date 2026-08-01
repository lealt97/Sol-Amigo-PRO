import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculatePayback,
  classifyPayback,
  OFFICIAL_PAYBACK_METHOD,
  PAYBACK_CASH_FLOW_RESOLUTION,
} from '../src/lib/calculations/payback';

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

test('projeta fluxo mensal, payback oficial, consolidação anual, VPL e TIR', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    analysisYears: 25,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 8,
    compensationFactorPercent: 100,
  });

  assert.equal(result.paybackMethod, OFFICIAL_PAYBACK_METHOD);
  assert.equal(result.cashFlowResolution, PAYBACK_CASH_FLOW_RESOLUTION);
  assert.equal(result.paybackYears, result.simplePaybackYears);
  assert.equal(result.paybackMonths, result.simplePaybackMonths);
  assert.equal(result.simplePaybackYears, 5);
  assert.equal(result.simplePaybackMonths, 60);
  assert.ok(result.discountedPaybackYears > result.simplePaybackYears);
  assert.equal(result.status, classifyPayback(result.paybackYears));
  assert.ok(result.netPresentValue > 0);
  assert.equal(result.internalRateOfReturnPercent, 21.76);
  assert.equal(result.monthlyData.length, 301);
  assert.equal(result.monthlyData[0]?.cumulativeBalance, -30_000);
  assert.equal(result.monthlyData[60]?.cumulativeBalance, 0);
  assert.equal(result.chartData.length, 26);
  assert.equal(result.chartData[0]?.cumulativeBalance, -30_000);
  assert.equal(result.chartData[5]?.cumulativeBalance, 0);
  assert.equal(result.hasCostBasis, true);
  assert.equal(result.directCost, 23_000);
  assert.equal(result.profitAmount, 7_000);
  assert.equal(result.marginPercentage, 23.33);
});

test('encontra o retorno no mês exato sem esperar o fechamento do ano', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    proposalPrice: 1_000,
    kitCost: null,
    monthlyCompensableConsumptionKwh: 100,
    monthlyGenerationKwh: 100,
    additionalCosts: [],
    analysisYears: 2,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.paybackMonths, 10);
  assert.equal(result.paybackYears, 0.83);
  assert.equal(result.monthlyData[9]?.cumulativeBalance, -100);
  assert.equal(result.monthlyData[10]?.cumulativeBalance, 0);
  assert.ok((result.chartData[1]?.cumulativeBalance ?? 0) > 0);
});

test('classifica a viabilidade pelo payback simples oficial, não pelo descontado', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    analysisYears: 25,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 18,
    compensationFactorPercent: 100,
  });

  assert.equal(result.paybackYears, 5);
  assert.equal(result.simplePaybackYears, 5);
  assert.ok(result.discountedPaybackYears > 10);
  assert.equal(result.status, 'very_good');
  assert.equal(result.statusLabel, 'Muito bom');
});

test('aplica degradação, reajuste tarifário, O&M e troca do inversor por mês', () => {
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
  assert.equal(result.monthlyData[60]?.replacementCost, 4_000);
  assert.equal(result.chartData[5]?.replacementCost, 4_000);
  assert.ok(result.lastYearGenerationKwh < result.firstYearGenerationKwh);
  assert.ok(result.monthlyData[13]!.tariffPerKwh > result.monthlyData[1]!.tariffPerKwh);
  assert.equal(result.compensationFactorPercent, 90);
});

test('usa perfis mensais de consumo e geração quando informados', () => {
  const generationProfile = [50, 150, 50, 150, 50, 150, 50, 150, 50, 150, 50, 150];
  const consumptionProfile = Array.from({ length: 12 }, () => 100);
  const result = calculatePayback({
    ...BASE_INPUT,
    proposalPrice: 1_200,
    kitCost: null,
    additionalCosts: [],
    monthlyCompensableConsumptionKwh: 100,
    monthlyGenerationKwh: 100,
    monthlyCompensableConsumptionProfileKwh: consumptionProfile,
    monthlyGenerationProfileKwh: generationProfile,
    analysisYears: 2,
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.monthlyData[1]?.compensatedEnergyKwh, 50);
  assert.equal(result.monthlyData[2]?.compensatedEnergyKwh, 100);
  assert.equal(result.annualSavings, 900);
  assert.equal(result.monthlySavings, 75);
  assert.equal(result.firstYearGenerationKwh, 1_200);
});

test('rejeita perfil mensal incompleto', () => {
  assert.throws(
    () => calculatePayback({
      ...BASE_INPUT,
      monthlyGenerationProfileKwh: [500, 500],
    }),
    /exatamente 12 meses/,
  );
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

test('compara a fatura média com economia média do primeiro ano', () => {
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
