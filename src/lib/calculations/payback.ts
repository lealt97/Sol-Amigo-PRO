import { runFinancialProjection } from './paybackFinancial';
import {
  PAYBACK_CALCULATION_VERSION,
  PAYBACK_STATUS_LABELS,
  assertNonNegative,
  assertPercent,
  assertPositive,
  classifyPayback,
  finiteOr,
  getRegulatoryChargePercent,
  round,
  type BillReferenceStatus,
  type PaybackInput,
  type PaybackResult,
  type RegulatoryFramework,
  type TariffTaxMode,
} from './paybackTypes';

export * from './paybackTypes';

export function calculatePayback(input: PaybackInput): PaybackResult {
  assertPositive(input.kitCost, 'Preço do kit');
  assertPercent(input.marginPercentage, 'Margem de lucro', 99.99);
  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');
  if (input.averageMonthlyBillAmount != null) assertPositive(input.averageMonthlyBillAmount, 'Valor médio mensal da fatura');
  assertNonNegative(finiteOr(input.monthlyAvailabilityConsumptionKwh, 0), 'Custo de disponibilidade');
  assertPercent(input.pisPercent, 'PIS');
  assertPercent(input.cofinsPercent, 'COFINS');
  assertPercent(input.icmsPercent, 'ICMS');
  assertPercent(input.otherTariffsPercent, 'Outros encargos');
  assertPositive(input.monthlyCompensableConsumptionKwh, 'Consumo compensável');
  assertPositive(input.monthlyGenerationKwh, 'Geração mensal');

  const tariffTaxMode: TariffTaxMode = input.tariffTaxMode ?? 'add_percentages';
  const regulatoryFramework: RegulatoryFramework = input.regulatoryFramework ?? 'gd1';
  const projectionStartYear = Math.trunc(finiteOr(input.projectionStartYear, new Date().getFullYear()));
  const fioBComponentsCentsPerKwh = finiteOr(input.fioBComponentsCentsPerKwh, 0);
  const customRegulatoryChargePercent = finiteOr(input.customRegulatoryChargePercent, 0);
  const postTransitionChargePercent = finiteOr(input.postTransitionChargePercent, 100);
  const selfConsumptionPercent = finiteOr(input.selfConsumptionPercent, 0);
  const annualTariffEscalationPercent = finiteOr(input.annualTariffEscalationPercent, 0);
  const annualDegradationPercent = finiteOr(input.annualDegradationPercent, 0);
  const annualMaintenancePercent = finiteOr(input.annualMaintenancePercent, 0);
  const annualDiscountRatePercent = finiteOr(input.annualDiscountRatePercent, 0);
  const inverterReplacementYear = input.inverterReplacementYear == null ? null : Math.trunc(input.inverterReplacementYear);
  const inverterReplacementCost = finiteOr(input.inverterReplacementCost, 0);
  const projectionYears = Math.min(40, Math.max(1, Math.trunc(finiteOr(input.projectionYears, 25))));

  assertNonNegative(fioBComponentsCentsPerKwh, 'Componentes do Fio B');
  assertPercent(customRegulatoryChargePercent, 'Cobrança regulatória personalizada');
  assertPercent(postTransitionChargePercent, 'Cobrança regulatória após a transição');
  assertPercent(selfConsumptionPercent, 'Autoconsumo instantâneo');
  assertPercent(annualTariffEscalationPercent, 'Reajuste anual da tarifa');
  assertPercent(annualDegradationPercent, 'Degradação anual');
  assertPercent(annualMaintenancePercent, 'Custo anual de operação e manutenção');
  assertPercent(annualDiscountRatePercent, 'Taxa anual de desconto');
  assertNonNegative(inverterReplacementCost, 'Custo de reposição do inversor');
  if (inverterReplacementYear != null && (inverterReplacementYear < 1 || inverterReplacementYear > projectionYears)) {
    throw new Error('Ano de reposição do inversor deve estar dentro do período de projeção.');
  }

  const additionalCostsTotal = input.additionalCosts.reduce((sum, cost) => {
    assertNonNegative(cost.amount, cost.description || 'Custo adicional');
    return sum + cost.amount;
  }, 0);
  const directCost = input.kitCost + additionalCostsTotal;
  const totalInvestment = directCost / (1 - input.marginPercentage / 100);
  const profitAmount = totalInvestment - directCost;
  const totalTariffsPercent = input.pisPercent + input.cofinsPercent + input.icmsPercent + input.otherTariffsPercent;
  const baseTariff = input.tariffCentsPerKwh / 100;
  const effectiveTariffPerKwh = tariffTaxMode === 'already_included'
    ? baseTariff
    : baseTariff * (1 + totalTariffsPercent / 100);
  const fioBComponentsPerKwh = fioBComponentsCentsPerKwh / 100;

  const projection = runFinancialProjection({
    totalInvestment,
    monthlyConsumptionKwh: input.monthlyCompensableConsumptionKwh,
    monthlyGenerationKwh: input.monthlyGenerationKwh,
    effectiveTariffPerKwh,
    fioBComponentsPerKwh,
    regulatoryFramework,
    projectionStartYear,
    customRegulatoryChargePercent,
    postTransitionChargePercent,
    selfConsumptionPercent,
    annualTariffEscalationPercent,
    annualDegradationPercent,
    annualMaintenancePercent,
    annualDiscountRatePercent,
    inverterReplacementYear,
    inverterReplacementCost,
    projectionYears,
  });

  const averageBill = input.averageMonthlyBillAmount ?? null;
  const availability = finiteOr(input.monthlyAvailabilityConsumptionKwh, 0);
  const estimatedEnergyBillAmount = (input.monthlyCompensableConsumptionKwh + availability) * effectiveTariffPerKwh;
  const minimumResidual = availability * effectiveTariffPerKwh;
  const estimatedResidualBillAmount = averageBill == null ? null : Math.min(
    averageBill,
    Math.max(averageBill - projection.firstMonthNetEnergySavings, minimumResidual),
  );
  const estimatedBillReductionPercent = averageBill == null || estimatedResidualBillAmount == null
    ? null
    : (averageBill - estimatedResidualBillAmount) / averageBill * 100;
  const billReferenceDifferencePercent = averageBill == null ? null : (
    Math.abs(averageBill - estimatedEnergyBillAmount) / Math.max(averageBill, estimatedEnergyBillAmount) * 100
  );
  const billReferenceStatus: BillReferenceStatus = billReferenceDifferencePercent == null
    ? 'not_informed'
    : billReferenceDifferencePercent <= 20 ? 'consistent' : 'review';

  const warnings = ['A projeção usa médias mensais e não simula sazonalidade nem o saldo de créditos de energia.'];
  if (regulatoryFramework !== 'gd1' && fioBComponentsPerKwh <= 0) warnings.push('Informe as componentes compensáveis do Fio B para aplicar a cobrança regulatória da energia injetada.');
  if (tariffTaxMode === 'add_percentages' && totalTariffsPercent === 0) warnings.push('Confirme se a tarifa informada já inclui tributos para evitar dupla contagem.');
  if (annualMaintenancePercent === 0) warnings.push('A projeção não desconta custos recorrentes de operação e manutenção.');
  if (inverterReplacementCost === 0) warnings.push('A projeção não inclui eventual reposição de inversor.');

  const statusBasis = Number.isFinite(projection.discountedPaybackYears)
    ? projection.discountedPaybackYears
    : projection.paybackYears;
  const status = projection.netPresentValue < 0 ? 'unfeasible' : classifyPayback(statusBasis);

  return {
    calculationVersion: PAYBACK_CALCULATION_VERSION,
    kitCost: round(input.kitCost),
    additionalCostsTotal: round(additionalCostsTotal),
    directCost: round(directCost),
    marginPercentage: round(input.marginPercentage),
    profitAmount: round(profitAmount),
    totalInvestment: round(totalInvestment),
    tariffTaxMode,
    totalTariffsPercent: round(totalTariffsPercent),
    effectiveTariffPerKwh: round(effectiveTariffPerKwh, 4),
    estimatedEnergyBillAmount: round(estimatedEnergyBillAmount),
    averageMonthlyBillAmount: averageBill == null ? null : round(averageBill),
    estimatedResidualBillAmount: estimatedResidualBillAmount == null ? null : round(estimatedResidualBillAmount),
    estimatedBillReductionPercent: estimatedBillReductionPercent == null ? null : round(estimatedBillReductionPercent),
    billReferenceDifferencePercent: billReferenceDifferencePercent == null ? null : round(billReferenceDifferencePercent),
    billReferenceStatus,
    regulatoryFramework,
    regulatoryChargePercentFirstYear: round(getRegulatoryChargePercent(regulatoryFramework, projectionStartYear, customRegulatoryChargePercent, postTransitionChargePercent)),
    fioBComponentsPerKwh: round(fioBComponentsPerKwh, 4),
    selfConsumptionPercent: round(selfConsumptionPercent),
    directSelfConsumptionKwhPerMonth: round(projection.firstMonthDirectSelfConsumption),
    gridCompensatedEnergyKwhPerMonth: round(projection.firstMonthGridCompensation),
    compensatedEnergyKwhPerMonth: round(projection.firstMonthDirectSelfConsumption + projection.firstMonthGridCompensation),
    grossMonthlySavings: round(projection.firstMonthGrossSavings),
    regulatoryMonthlyCharge: round(projection.firstMonthRegulatoryCharge),
    monthlySavings: round(projection.firstMonthNetEnergySavings),
    annualSavings: round(projection.annualSavings),
    annualOperatingCost: round(projection.annualOperatingCost),
    firstYearNetCashFlow: round(projection.firstYearNetCashFlow),
    simplePaybackYears: round(projection.simplePaybackYears, 2),
    paybackYears: round(projection.paybackYears, 2),
    paybackMonths: projection.paybackMonths,
    discountedPaybackYears: round(projection.discountedPaybackYears, 2),
    discountedPaybackMonths: projection.discountedPaybackMonths,
    netPresentValue: round(projection.netPresentValue),
    internalRateOfReturnPercent: projection.internalRateOfReturnPercent == null ? null : round(projection.internalRateOfReturnPercent, 2),
    projectedGrossSavings: round(projection.projectedGrossSavings),
    projectedNetSavings: round(projection.projectedNetSavings),
    projectionYears,
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    warnings,
    chartData: projection.chartData,
  };
}
