export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'unfeasible';
export type BillReferenceStatus = 'not_informed' | 'consistent' | 'review';

export type PaybackAdditionalCost = {
  description: string;
  amount: number;
};

export type PaybackInput = {
  proposalPrice: number;
  kitCost?: number | null;
  tariffCentsPerKwh: number;
  averageMonthlyBillAmount?: number | null;
  monthlyAvailabilityConsumptionKwh?: number;
  pisPercent: number;
  cofinsPercent: number;
  icmsPercent: number;
  otherTariffsPercent: number;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  additionalCosts: PaybackAdditionalCost[];
  analysisYears?: number;
  annualTariffEscalationPercent?: number;
  annualGenerationDegradationPercent?: number;
  annualOperationMaintenancePercent?: number;
  discountRatePercent?: number;
  compensationFactorPercent?: number;
  inverterReplacementYear?: number | null;
  inverterReplacementCost?: number;
};

export type PaybackChartPoint = {
  year: number;
  generationKwh: number;
  tariffPerKwh: number;
  grossSavings: number;
  operationMaintenanceCost: number;
  replacementCost: number;
  netCashFlow: number;
  discountedCashFlow: number;
  cumulativeBalance: number;
  discountedCumulativeBalance: number;
};

export type PaybackResult = {
  kitCost: number;
  hasCostBasis: boolean;
  additionalCostsTotal: number;
  directCost: number;
  marginPercentage: number;
  profitAmount: number;
  totalInvestment: number;
  totalTariffsPercent: number;
  effectiveTariffPerKwh: number;
  estimatedEnergyBillAmount: number;
  averageMonthlyBillAmount: number | null;
  estimatedResidualBillAmount: number | null;
  estimatedBillReductionPercent: number | null;
  billReferenceDifferencePercent: number | null;
  billReferenceStatus: BillReferenceStatus;
  compensatedEnergyKwhPerMonth: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  paybackMonths: number;
  simplePaybackYears: number;
  simplePaybackMonths: number;
  discountedPaybackYears: number;
  discountedPaybackMonths: number;
  netPresentValue: number;
  internalRateOfReturnPercent: number | null;
  lifetimeGrossSavings: number;
  lifetimeNetSavings: number;
  totalOperationMaintenanceCost: number;
  totalReplacementCost: number;
  firstYearGenerationKwh: number;
  lastYearGenerationKwh: number;
  analysisYears: number;
  annualTariffEscalationPercent: number;
  annualGenerationDegradationPercent: number;
  annualOperationMaintenancePercent: number;
  discountRatePercent: number;
  compensationFactorPercent: number;
  status: PaybackStatus;
  statusLabel: string;
  chartData: PaybackChartPoint[];
};

export const PAYBACK_STATUS_LABELS: Record<PaybackStatus, string> = {
  excellent: 'Excelente',
  very_good: 'Muito bom',
  good: 'Bom',
  regular: 'Regular',
  unfeasible: 'Inviável',
};

const round = (value: number, decimals = 2) => {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} deve ser igual ou maior que zero.`);
  }
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} deve ser maior que zero.`);
  }
};

const assertBetween = (value: number, min: number, max: number, field: string) => {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} deve estar entre ${min} e ${max}.`);
  }
};

const crossingYears = (
  points: PaybackChartPoint[],
  field: 'cumulativeBalance' | 'discountedCumulativeBalance',
) => {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    if (current[field] < 0) continue;
    if (previous[field] >= 0) return previous.year;

    const movement = current[field] - previous[field];
    if (movement <= 0) return current.year;
    const fraction = Math.min(1, Math.max(0, -previous[field] / movement));
    return previous.year + fraction;
  }

  return Number.POSITIVE_INFINITY;
};

const calculateIrr = (cashFlows: number[]) => {
  const npvAt = (rate: number) => cashFlows.reduce(
    (total, cashFlow, year) => total + (cashFlow / ((1 + rate) ** year)),
    0,
  );

  let lower = -0.9999;
  let upper = 10;
  let lowerValue = npvAt(lower);
  let upperValue = npvAt(upper);
  if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue) || lowerValue * upperValue > 0) {
    return null;
  }

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    const midpointValue = npvAt(midpoint);
    if (!Number.isFinite(midpointValue)) return null;
    if (Math.abs(midpointValue) < 0.000001) return midpoint * 100;

    if (lowerValue * midpointValue <= 0) {
      upper = midpoint;
      upperValue = midpointValue;
    } else {
      lower = midpoint;
      lowerValue = midpointValue;
    }
  }

  return ((lower + upper) / 2) * 100;
};

export function classifyPayback(paybackYears: number): PaybackStatus {
  if (!Number.isFinite(paybackYears) || paybackYears > 10) return 'unfeasible';
  if (paybackYears <= 3) return 'excellent';
  if (paybackYears <= 5) return 'very_good';
  if (paybackYears <= 7) return 'good';
  return 'regular';
}

export function calculatePayback(input: PaybackInput): PaybackResult {
  assertPositive(input.proposalPrice, 'Preço da proposta');

  const kitCost = input.kitCost ?? null;
  if (kitCost != null) assertPositive(kitCost, 'Custo do kit');

  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');
  const averageMonthlyBillAmount = input.averageMonthlyBillAmount ?? null;
  if (averageMonthlyBillAmount != null) {
    assertPositive(averageMonthlyBillAmount, 'Valor médio mensal da fatura');
  }

  const monthlyAvailabilityConsumptionKwh = input.monthlyAvailabilityConsumptionKwh ?? 0;
  assertNonNegative(monthlyAvailabilityConsumptionKwh, 'Custo de disponibilidade');
  assertNonNegative(input.pisPercent, 'PIS');
  assertNonNegative(input.cofinsPercent, 'COFINS');
  assertNonNegative(input.icmsPercent, 'ICMS');
  assertNonNegative(input.otherTariffsPercent, 'Outros encargos');
  assertPositive(input.monthlyCompensableConsumptionKwh, 'Consumo compensável');
  assertPositive(input.monthlyGenerationKwh, 'Geração mensal');

  const analysisYears = Math.trunc(input.analysisYears ?? 25);
  const annualTariffEscalationPercent = input.annualTariffEscalationPercent ?? 4.5;
  const annualGenerationDegradationPercent = input.annualGenerationDegradationPercent ?? 0.5;
  const annualOperationMaintenancePercent = input.annualOperationMaintenancePercent ?? 0.5;
  const discountRatePercent = input.discountRatePercent ?? 8;
  const compensationFactorPercent = input.compensationFactorPercent ?? 100;
  const inverterReplacementYear = input.inverterReplacementYear ?? null;
  const inverterReplacementCost = input.inverterReplacementCost ?? 0;

  assertBetween(analysisYears, 1, 40, 'Horizonte de análise');
  assertBetween(annualTariffEscalationPercent, -20, 100, 'Reajuste anual da tarifa');
  assertBetween(annualGenerationDegradationPercent, 0, 10, 'Degradação anual da geração');
  assertBetween(annualOperationMaintenancePercent, 0, 20, 'Custo anual de operação e manutenção');
  assertBetween(discountRatePercent, 0, 100, 'Taxa de desconto');
  assertBetween(compensationFactorPercent, 0, 100, 'Fator efetivo de compensação');
  assertNonNegative(inverterReplacementCost, 'Custo de substituição do inversor');
  if (inverterReplacementYear != null) {
    assertBetween(Math.trunc(inverterReplacementYear), 1, analysisYears, 'Ano de substituição do inversor');
  }

  const additionalCostsTotal = input.additionalCosts.reduce((total, cost) => {
    assertNonNegative(cost.amount, cost.description || 'Custo adicional');
    return total + cost.amount;
  }, 0);

  const hasCostBasis = kitCost != null;
  const directCost = hasCostBasis ? kitCost + additionalCostsTotal : input.proposalPrice;
  const profitAmount = hasCostBasis ? input.proposalPrice - directCost : 0;
  const marginPercentage = hasCostBasis
    ? (profitAmount / input.proposalPrice) * 100
    : 0;
  const totalInvestment = input.proposalPrice;

  const totalTariffsPercent = input.pisPercent
    + input.cofinsPercent
    + input.icmsPercent
    + input.otherTariffsPercent;
  const effectiveTariffPerKwh = (input.tariffCentsPerKwh / 100) * (1 + totalTariffsPercent / 100);
  const compensationFraction = compensationFactorPercent / 100;
  const discountRate = discountRatePercent / 100;
  const degradationRate = annualGenerationDegradationPercent / 100;
  const tariffEscalationRate = annualTariffEscalationPercent / 100;
  const annualOperationMaintenanceCost = input.proposalPrice * (annualOperationMaintenancePercent / 100);

  let cumulativeBalance = -input.proposalPrice;
  let discountedCumulativeBalance = -input.proposalPrice;
  let lifetimeGrossSavings = 0;
  let lifetimeNetSavings = 0;
  let totalOperationMaintenanceCost = 0;
  let totalReplacementCost = 0;

  const chartData: PaybackChartPoint[] = [{
    year: 0,
    generationKwh: 0,
    tariffPerKwh: effectiveTariffPerKwh,
    grossSavings: 0,
    operationMaintenanceCost: 0,
    replacementCost: 0,
    netCashFlow: -input.proposalPrice,
    discountedCashFlow: -input.proposalPrice,
    cumulativeBalance,
    discountedCumulativeBalance,
  }];

  const cashFlows = [-input.proposalPrice];

  for (let year = 1; year <= analysisYears; year += 1) {
    const generationFactor = (1 - degradationRate) ** (year - 1);
    const tariffFactor = (1 + tariffEscalationRate) ** (year - 1);
    const monthlyGenerationYear = input.monthlyGenerationKwh * generationFactor;
    const compensatedEnergyKwhPerMonth = Math.min(
      input.monthlyCompensableConsumptionKwh,
      monthlyGenerationYear,
    ) * compensationFraction;
    const tariffPerKwh = effectiveTariffPerKwh * tariffFactor;
    const grossSavings = compensatedEnergyKwhPerMonth * tariffPerKwh * 12;
    const replacementCost = inverterReplacementCost > 0
      && inverterReplacementYear != null
      && year === Math.trunc(inverterReplacementYear)
      ? inverterReplacementCost
      : 0;
    const netCashFlow = grossSavings - annualOperationMaintenanceCost - replacementCost;
    const discountedCashFlow = netCashFlow / ((1 + discountRate) ** year);

    cumulativeBalance += netCashFlow;
    discountedCumulativeBalance += discountedCashFlow;
    lifetimeGrossSavings += grossSavings;
    lifetimeNetSavings += netCashFlow;
    totalOperationMaintenanceCost += annualOperationMaintenanceCost;
    totalReplacementCost += replacementCost;
    cashFlows.push(netCashFlow);

    chartData.push({
      year,
      generationKwh: monthlyGenerationYear * 12,
      tariffPerKwh,
      grossSavings,
      operationMaintenanceCost: annualOperationMaintenanceCost,
      replacementCost,
      netCashFlow,
      discountedCashFlow,
      cumulativeBalance,
      discountedCumulativeBalance,
    });
  }

  const firstYear = chartData[1];
  const lastYear = chartData[chartData.length - 1];
  if (!firstYear || !lastYear) throw new Error('Não foi possível projetar o fluxo de caixa.');

  const compensatedEnergyKwhPerMonth = Math.min(
    input.monthlyCompensableConsumptionKwh,
    input.monthlyGenerationKwh,
  ) * compensationFraction;
  const monthlySavings = compensatedEnergyKwhPerMonth * effectiveTariffPerKwh;
  const annualSavings = monthlySavings * 12;
  const estimatedEnergyBillAmount = (
    input.monthlyCompensableConsumptionKwh + monthlyAvailabilityConsumptionKwh
  ) * effectiveTariffPerKwh;
  const minimumResidualBillAmount = monthlyAvailabilityConsumptionKwh * effectiveTariffPerKwh;
  const estimatedResidualBillAmount = averageMonthlyBillAmount == null
    ? null
    : Math.min(
        averageMonthlyBillAmount,
        Math.max(averageMonthlyBillAmount - monthlySavings, minimumResidualBillAmount),
      );
  const estimatedBillReductionPercent = averageMonthlyBillAmount == null || estimatedResidualBillAmount == null
    ? null
    : ((averageMonthlyBillAmount - estimatedResidualBillAmount) / averageMonthlyBillAmount) * 100;
  const billReferenceDifferencePercent = averageMonthlyBillAmount == null
    ? null
    : (Math.abs(averageMonthlyBillAmount - estimatedEnergyBillAmount)
      / Math.max(averageMonthlyBillAmount, estimatedEnergyBillAmount)) * 100;
  const billReferenceStatus: BillReferenceStatus = billReferenceDifferencePercent == null
    ? 'not_informed'
    : billReferenceDifferencePercent <= 20
      ? 'consistent'
      : 'review';

  const simplePaybackYears = crossingYears(chartData, 'cumulativeBalance');
  const discountedPaybackYears = crossingYears(chartData, 'discountedCumulativeBalance');
  const evaluationPaybackYears = Number.isFinite(discountedPaybackYears)
    ? discountedPaybackYears
    : simplePaybackYears;
  const status = classifyPayback(evaluationPaybackYears);
  const internalRateOfReturnPercent = calculateIrr(cashFlows);

  return {
    kitCost: round(kitCost ?? 0),
    hasCostBasis,
    additionalCostsTotal: round(additionalCostsTotal),
    directCost: round(directCost),
    marginPercentage: round(marginPercentage),
    profitAmount: round(profitAmount),
    totalInvestment: round(totalInvestment),
    totalTariffsPercent: round(totalTariffsPercent),
    effectiveTariffPerKwh: round(effectiveTariffPerKwh, 4),
    estimatedEnergyBillAmount: round(estimatedEnergyBillAmount),
    averageMonthlyBillAmount: averageMonthlyBillAmount == null ? null : round(averageMonthlyBillAmount),
    estimatedResidualBillAmount: estimatedResidualBillAmount == null ? null : round(estimatedResidualBillAmount),
    estimatedBillReductionPercent: estimatedBillReductionPercent == null ? null : round(estimatedBillReductionPercent),
    billReferenceDifferencePercent: billReferenceDifferencePercent == null ? null : round(billReferenceDifferencePercent),
    billReferenceStatus,
    compensatedEnergyKwhPerMonth: round(compensatedEnergyKwhPerMonth),
    monthlySavings: round(monthlySavings),
    annualSavings: round(annualSavings),
    paybackYears: round(simplePaybackYears, 2),
    paybackMonths: Number.isFinite(simplePaybackYears) ? Math.ceil(simplePaybackYears * 12) : Number.POSITIVE_INFINITY,
    simplePaybackYears: round(simplePaybackYears, 2),
    simplePaybackMonths: Number.isFinite(simplePaybackYears) ? Math.ceil(simplePaybackYears * 12) : Number.POSITIVE_INFINITY,
    discountedPaybackYears: round(discountedPaybackYears, 2),
    discountedPaybackMonths: Number.isFinite(discountedPaybackYears) ? Math.ceil(discountedPaybackYears * 12) : Number.POSITIVE_INFINITY,
    netPresentValue: round(discountedCumulativeBalance),
    internalRateOfReturnPercent: internalRateOfReturnPercent == null ? null : round(internalRateOfReturnPercent, 2),
    lifetimeGrossSavings: round(lifetimeGrossSavings),
    lifetimeNetSavings: round(lifetimeNetSavings),
    totalOperationMaintenanceCost: round(totalOperationMaintenanceCost),
    totalReplacementCost: round(totalReplacementCost),
    firstYearGenerationKwh: round(firstYear.generationKwh),
    lastYearGenerationKwh: round(lastYear.generationKwh),
    analysisYears,
    annualTariffEscalationPercent: round(annualTariffEscalationPercent),
    annualGenerationDegradationPercent: round(annualGenerationDegradationPercent),
    annualOperationMaintenancePercent: round(annualOperationMaintenancePercent),
    discountRatePercent: round(discountRatePercent),
    compensationFactorPercent: round(compensationFactorPercent),
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    chartData: chartData.map((point) => ({
      ...point,
      generationKwh: round(point.generationKwh),
      tariffPerKwh: round(point.tariffPerKwh, 4),
      grossSavings: round(point.grossSavings),
      operationMaintenanceCost: round(point.operationMaintenanceCost),
      replacementCost: round(point.replacementCost),
      netCashFlow: round(point.netCashFlow),
      discountedCashFlow: round(point.discountedCashFlow),
      cumulativeBalance: round(point.cumulativeBalance),
      discountedCumulativeBalance: round(point.discountedCumulativeBalance),
    })),
  };
}
