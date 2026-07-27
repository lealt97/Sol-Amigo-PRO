import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculatePayback,
  classifyPayback,
  getRegulatoryChargePercent,
} from '../src/lib/calculations/payback';

const neutralProjection = {
  regulatoryFramework: 'gd1' as const,
  selfConsumptionPercent: 0,
  annualTariffEscalationPercent: 0,
  annualDegradationPercent: 0,
  annualMaintenancePercent: 0,
  annualDiscountRatePercent: 0,
  inverterReplacementCost: 0,
};

test('preserva o cálculo comercial existente quando as novas premissas são neutras', () => {
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
    ...neutralProjection,
  });

  assert.equal(result.additionalCostsTotal, 5_000);
  assert.equal(result.directCost, 25_000);
  assert.equal(result.totalInvestment, 31_250);
  assert.equal(result.profitAmount, 6_250);
  assert.equal(result.effectiveTariffPerKwh, 1.1);
  assert.equal(result.compensatedEnergyKwhPerMonth, 500);
  assert.equal(result.monthlySavings, 550);
  assert.equal(result.annualSavings, 6_600);
  assert.equal(result.simplePaybackYears, 4.73);
  assert.equal(result.paybackMonths, 57);
  assert.equal(result.paybackYears, 4.75);
  assert.equal(result.discountedPaybackMonths, 57);
  assert.equal(result.status, 'very_good');
  assert.equal(result.chartData[0]?.cumulativeBalance, -31_250);
  assert.equal(result.chartData[5]?.cumulativeBalance, 1_750);
  assert.equal(result.chartData.length, 26);
});

test('não soma tributos novamente quando a tarifa final já os contém', () => {
  const result = calculatePayback({
    kitCost: 10_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    tariffTaxMode: 'already_included',
    pisPercent: 2,
    cofinsPercent: 3,
    icmsPercent: 20,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 300,
    monthlyGenerationKwh: 300,
    additionalCosts: [],
    ...neutralProjection,
  });

  assert.equal(result.effectiveTariffPerKwh, 1);
  assert.equal(result.monthlySavings, 300);
});

test('aplica a transição da Lei 14.300 somente à energia compensada pela rede', () => {
  const result = calculatePayback({
    kitCost: 10_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    tariffTaxMode: 'already_included',
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 500,
    monthlyGenerationKwh: 500,
    additionalCosts: [],
    regulatoryFramework: 'transition',
    projectionStartYear: 2026,
    fioBComponentsCentsPerKwh: 30,
    selfConsumptionPercent: 40,
    annualTariffEscalationPercent: 0,
    annualDegradationPercent: 0,
    annualMaintenancePercent: 0,
    annualDiscountRatePercent: 0,
    inverterReplacementCost: 0,
  });

  assert.equal(result.regulatoryChargePercentFirstYear, 60);
  assert.equal(result.directSelfConsumptionKwhPerMonth, 200);
  assert.equal(result.gridCompensatedEnergyKwhPerMonth, 300);
  assert.equal(result.grossMonthlySavings, 500);
  assert.equal(result.regulatoryMonthlyCharge, 54);
  assert.equal(result.monthlySavings, 446);
});

test('usa a tabela legal de transição e permite premissa pós-2029', () => {
  assert.equal(getRegulatoryChargePercent('transition', 2023), 15);
  assert.equal(getRegulatoryChargePercent('transition', 2026), 60);
  assert.equal(getRegulatoryChargePercent('transition', 2028), 90);
  assert.equal(getRegulatoryChargePercent('transition', 2029, 0, 80), 80);
  assert.equal(getRegulatoryChargePercent('gd1', 2035), 0);
  assert.equal(getRegulatoryChargePercent('custom', 2035, 37), 37);
});

test('inclui degradação, manutenção, desconto e troca de inversor no fluxo de caixa', () => {
  const result = calculatePayback({
    kitCost: 20_000,
    marginPercentage: 0,
    tariffCentsPerKwh: 100,
    tariffTaxMode: 'already_included',
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 500,
    monthlyGenerationKwh: 500,
    additionalCosts: [],
    regulatoryFramework: 'gd1',
    selfConsumptionPercent: 0,
    annualTariffEscalationPercent: 4,
    annualDegradationPercent: 0.5,
    annualMaintenancePercent: 1,
    annualDiscountRatePercent: 8,
    inverterReplacementYear: 10,
    inverterReplacementCost: 5_000,
    projectionYears: 25,
  });

  assert.equal(result.annualOperatingCost, 200);
  assert.ok(result.firstYearNetCashFlow < result.annualSavings);
  assert.ok(result.discountedPaybackMonths > result.paybackMonths);
  assert.ok(result.netPresentValue > 0);
  assert.ok((result.internalRateOfReturnPercent ?? 0) > 0);
  assert.ok(result.projectedNetSavings < result.projectedGrossSavings - result.totalInvestment);
});

test('classifica retorno longo sem declarar inviabilidade apenas por superar dez anos', () => {
  assert.equal(classifyPayback(3), 'excellent');
  assert.equal(classifyPayback(5), 'very_good');
  assert.equal(classifyPayback(7), 'good');
  assert.equal(classifyPayback(15), 'regular');
  assert.equal(classifyPayback(Number.POSITIVE_INFINITY), 'unfeasible');
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
    ...neutralProjection,
  });

  assert.equal(result.estimatedEnergyBillAmount, 500);
  assert.equal(result.averageMonthlyBillAmount, 610);
  assert.equal(result.estimatedResidualBillAmount, 210);
  assert.equal(result.estimatedBillReductionPercent, 65.57);
  assert.equal(result.billReferenceDifferencePercent, 18.03);
  assert.equal(result.billReferenceStatus, 'consistent');
});
