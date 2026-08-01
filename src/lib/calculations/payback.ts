export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'unfeasible';
export type BillReferenceStatus = 'not_informed' | 'consistent' | 'review';

export const OFFICIAL_PAYBACK_METHOD = 'simple' as const;
export type OfficialPaybackMethod = typeof OFFICIAL_PAYBACK_METHOD;
export const PAYBACK_CASH_FLOW_RESOLUTION = 'monthly' as const;
export type PaybackCashFlowResolution = typeof PAYBACK_CASH_FLOW_RESOLUTION;

export type PaybackAdditionalCost = {
  description: string;
  amount: number;
};

export type PaybackInput = {
  proposalPrice: number;
  kitCost?: number | null;
  manualSystemCost?: number | null;
  tariffCentsPerKwh: number;
  averageMonthlyBillAmount?: number | null;
  monthlyAvailabilityConsumptionKwh?: number;
  pisPercent: number;
  cofinsPercent: number;
  icmsPercent: number;
  otherTariffsPercent: number;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  monthlyCompensableConsumptionProfileKwh?: number[] | null;
  monthlyGenerationProfileKwh?: number[] | null;
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

export type PaybackMonthlyPoint = {
  month: number;
  year: number;
  monthOfYear: number;
  generationKwh: number;
  compensableConsumptionKwh: number;
  compensatedEnergyKwh: number;
  tariffPerKwh: number;
  grossSavings: number;
  operationMaintenanceCost: number;
  replacementCost: number;
  netCashFlow: number;
  discountedCashFlow: number;
  cumulativeBalance: number;
  discountedCumulativeBalance: number;
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
  baseSystemCost: number;
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
  paybackMethod: OfficialPaybackMethod;
  cashFlowResolution: PaybackCashFlowResolution;
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
  monthlyData: PaybackMonthlyPoint[];
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

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

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

const resolveMonthlyProfile = (
  profile: number[] | null | undefined,
  fallbackValue: number,
  field: string,
) => {
  if (profile == null) return Array.from({ length: 12 }, () => fallbackValue);
  if (profile.length !== 12) throw new Error(`${field} deve possuir exatamente 12 meses.`);

  profile.forEach((value, index) => {
    assertNonNegative(value, `${field} — mês ${index + 1}`);
  });
  if (!profile.some((value) => value > 0)) {
    throw new Error(`${field} deve possuir pelo menos um mês maior que zero.`);
  }
  return [...profile];
};

const annualRateToMonthlyRate = (annualPercent: number) => (
  (1 + annualPercent / 100) ** (1 / 12) - 1
);

const crossingPeriods = (
  points: PaybackMonthlyPoint[],
  field: 'cumulativeBalance' | 'discountedCumulativeBalance',
) => {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current || current[field] < 0) continue;
    if (previous[field] >= 0) return previous.month;

    const movement = current[field] - previous[field];
    if (movement <= 0) return current.month;
    return previous.month + Math.min(1, Math.max(0, -previous[field] / movement));
  }
  return Number.POSITIVE_INFINITY;
};

const ceilPeriod = (value: number) => (
  Number.isFinite(value) ? Math.ceil(value - 0.000000001) : Number.POSITIVE_INFINITY
);

const calculatePeriodicIrr = (cashFlows: number[]) => {
  const npvAt = (rate: number) => cashFlows.reduce(
    (total, cashFlow, period) => total + cashFlow / ((1 + rate) ** period),
    0,
  );

  const candidateRates = [
    -0.9, -0.5, -0.25, -0.1, -0.05, -0.01,
    0, 0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10,
  ];
  let previousRate: number | null = null;
  let previousValue: number | null = null;
  let lower: number | null = null;
  let upper: number | null = null;

  for (const rate of candidateRates) {
    const value = npvAt(rate);
    if (!Number.isFinite(value)) continue;
    if (Math.abs(value) < 0.000001) return rate;
    if (previousRate != null && previousValue != null && previousValue * value < 0) {
      lower = previousRate;
      upper = rate;
      break;
    }
    previousRate = rate;
    previousValue = value;
  }

  if (lower == null || upper == null) return null;
  let lowerBound: number = lower;
  let upperBound: number = upper;
  let lowerValue = npvAt(lowerBound);

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const midpoint = (lowerBound + upperBound) / 2;
    const midpointValue = npvAt(midpoint);
    if (!Number.isFinite(midpointValue)) return null;
    if (Math.abs(midpointValue) < 0.000001) return midpoint;

    if (lowerValue * midpointValue <= 0) {
      upperBound = midpoint;
    } else {
      lowerBound = midpoint;
      lowerValue = midpointValue;
    }
  }
  return (lowerBound + upperBound) / 2;
};

const aggregateAnnualChart = (
  monthlyData: PaybackMonthlyPoint[],
  analysisYears: number,
): PaybackChartPoint[] => {
  const initial = monthlyData[0];
  if (!initial) throw new Error('Não foi possível iniciar o fluxo de caixa mensal.');

  const chartData: PaybackChartPoint[] = [{
    year: 0,
    generationKwh: 0,
    tariffPerKwh: initial.tariffPerKwh,
    grossSavings: 0,
    operationMaintenanceCost: 0,
    replacementCost: 0,
    netCashFlow: initial.netCashFlow,
    discountedCashFlow: initial.discountedCashFlow,
    cumulativeBalance: initial.cumulativeBalance,
    discountedCumulativeBalance: initial.discountedCumulativeBalance,
  }];

  for (let year = 1; year <= analysisYears; year += 1) {
    const firstMonthIndex = (year - 1) * 12 + 1;
    const months = monthlyData.slice(firstMonthIndex, firstMonthIndex + 12);
    const lastMonth = months[months.length - 1];
    if (months.length !== 12 || !lastMonth) {
      throw new Error(`Não foi possível consolidar o ano ${year} do fluxo de caixa.`);
    }

    chartData.push({
      year,
      generationKwh: sum(months.map((point) => point.generationKwh)),
      tariffPerKwh: sum(months.map((point) => point.tariffPerKwh)) / months.length,
      grossSavings: sum(months.map((point) => point.grossSavings)),
      operationMaintenanceCost: sum(months.map((point) => point.operationMaintenanceCost)),
      replacementCost: sum(months.map((point) => point.replacementCost)),
      netCashFlow: sum(months.map((point) => point.netCashFlow)),
      discountedCashFlow: sum(months.map((point) => point.discountedCashFlow)),
      cumulativeBalance: lastMonth.cumulativeBalance,
      discountedCumulativeBalance: lastMonth.discountedCumulativeBalance,
    });
  }
  return chartData;
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
  const manualSystemCost = input.manualSystemCost ?? null;
  if (manualSystemCost != null) assertPositive(manualSystemCost, 'Custo estimado do sistema');
  const baseSystemCost = kitCost ?? manualSystemCost;

  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');
  const averageMonthlyBillAmount = input.averageMonthlyBillAmount ?? null;
  if (averageMonthlyBillAmount != null) assertPositive(averageMonthlyBillAmount, 'Valor médio mensal da fatura');

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

  const consumptionProfile = resolveMonthlyProfile(
    input.monthlyCompensableConsumptionProfileKwh,
    input.monthlyCompensableConsumptionKwh,
    'Perfil mensal de consumo compensável',
  );
  const generationProfile = resolveMonthlyProfile(
    input.monthlyGenerationProfileKwh,
    input.monthlyGenerationKwh,
    'Perfil mensal de geração',
  );

  const additionalCostsTotal = input.additionalCosts.reduce((total, cost) => {
    assertNonNegative(cost.amount, cost.description || 'Custo adicional');
    return total + cost.amount;
  }, 0);
  const hasCostBasis = baseSystemCost != null;
  const directCost = hasCostBasis ? baseSystemCost + additionalCostsTotal : input.proposalPrice;
  const profitAmount = hasCostBasis ? input.proposalPrice - directCost : 0;
  const marginPercentage = hasCostBasis ? (profitAmount / input.proposalPrice) * 100 : 0;

  const totalTariffsPercent = input.pisPercent
    + input.cofinsPercent
    + input.icmsPercent
    + input.otherTariffsPercent;
  const effectiveTariffPerKwh = (input.tariffCentsPerKwh / 100) * (1 + totalTariffsPercent / 100);
  const compensationFraction = compensationFactorPercent / 100;
  const monthlyDiscountRate = annualRateToMonthlyRate(discountRatePercent);
  const monthlyTariffEscalationRate = annualRateToMonthlyRate(annualTariffEscalationPercent);
  const annualGenerationRetention = 1 - annualGenerationDegradationPercent / 100;
  const monthlyOperationMaintenanceCost = input.proposalPrice
    * (annualOperationMaintenancePercent / 100) / 12;
  const replacementMonth = inverterReplacementYear == null
    ? null
    : Math.trunc(inverterReplacementYear) * 12;
  const analysisMonths = analysisYears * 12;

  let cumulativeBalance = -input.proposalPrice;
  let discountedCumulativeBalance = -input.proposalPrice;
  let lifetimeGrossSavings = 0;
  let lifetimeNetSavings = 0;
  let totalOperationMaintenanceCost = 0;
  let totalReplacementCost = 0;

  const monthlyData: PaybackMonthlyPoint[] = [{
    month: 0,
    year: 0,
    monthOfYear: 0,
    generationKwh: 0,
    compensableConsumptionKwh: 0,
    compensatedEnergyKwh: 0,
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

  for (let month = 1; month <= analysisMonths; month += 1) {
    const monthOfYear = ((month - 1) % 12) + 1;
    const year = Math.floor((month - 1) / 12) + 1;
    const generationFactor = annualGenerationRetention ** ((month - 1) / 12);
    const generationKwh = (generationProfile[monthOfYear - 1] ?? input.monthlyGenerationKwh) * generationFactor;
    const compensableConsumptionKwh = consumptionProfile[monthOfYear - 1]
      ?? input.monthlyCompensableConsumptionKwh;
    const compensatedEnergyKwh = Math.min(compensableConsumptionKwh, generationKwh) * compensationFraction;
    const tariffPerKwh = effectiveTariffPerKwh * ((1 + monthlyTariffEscalationRate) ** (month - 1));
    const grossSavings = compensatedEnergyKwh * tariffPerKwh;
    const replacementCost = inverterReplacementCost > 0 && replacementMonth === month
      ? inverterReplacementCost
      : 0;
    const netCashFlow = grossSavings - monthlyOperationMaintenanceCost - replacementCost;
    const discountedCashFlow = netCashFlow / ((1 + monthlyDiscountRate) ** month);

    cumulativeBalance += netCashFlow;
    discountedCumulativeBalance += discountedCashFlow;
    lifetimeGrossSavings += grossSavings;
    lifetimeNetSavings += netCashFlow;
    totalOperationMaintenanceCost += monthlyOperationMaintenanceCost;
    totalReplacementCost += replacementCost;
    cashFlows.push(netCashFlow);

    monthlyData.push({
      month,
      year,
      monthOfYear,
      generationKwh,
      compensableConsumptionKwh,
      compensatedEnergyKwh,
      tariffPerKwh,
      grossSavings,
      operationMaintenanceCost: monthlyOperationMaintenanceCost,
      replacementCost,
      netCashFlow,
      discountedCashFlow,
      cumulativeBalance,
      discountedCumulativeBalance,
    });
  }

  const firstYearMonths = monthlyData.slice(1, 13);
  const lastYearMonths = monthlyData.slice(-12);
  if (firstYearMonths.length !== 12 || lastYearMonths.length !== 12) {
    throw new Error('Não foi possível projetar o fluxo de caixa mensal.');
  }

  const annualSavings = sum(firstYearMonths.map((point) => point.grossSavings));
  const monthlySavings = annualSavings / 12;
  const compensatedEnergyKwhPerMonth = sum(firstYearMonths.map((point) => point.compensatedEnergyKwh)) / 12;
  const firstYearGenerationKwh = sum(firstYearMonths.map((point) => point.generationKwh));
  const lastYearGenerationKwh = sum(lastYearMonths.map((point) => point.generationKwh));

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
    : Math.abs(averageMonthlyBillAmount - estimatedEnergyBillAmount)
      / Math.max(averageMonthlyBillAmount, estimatedEnergyBillAmount) * 100;
  const billReferenceStatus: BillReferenceStatus = billReferenceDifferencePercent == null
    ? 'not_informed'
    : billReferenceDifferencePercent <= 20 ? 'consistent' : 'review';

  const simplePaybackMonthsExact = crossingPeriods(monthlyData, 'cumulativeBalance');
  const discountedPaybackMonthsExact = crossingPeriods(monthlyData, 'discountedCumulativeBalance');
  const officialPaybackYears = simplePaybackMonthsExact / 12;
  const status = classifyPayback(officialPaybackYears);
  const monthlyIrr = calculatePeriodicIrr(cashFlows);
  const internalRateOfReturnPercent = monthlyIrr == null
    ? null
    : (((1 + monthlyIrr) ** 12) - 1) * 100;
  const chartData = aggregateAnnualChart(monthlyData, analysisYears);

  return {
    kitCost: round(kitCost ?? 0),
    hasCostBasis,
    baseSystemCost: round(baseSystemCost ?? 0),
    additionalCostsTotal: round(additionalCostsTotal),
    directCost: round(directCost),
    marginPercentage: round(marginPercentage),
    profitAmount: round(profitAmount),
    totalInvestment: round(input.proposalPrice),
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
    paybackMethod: OFFICIAL_PAYBACK_METHOD,
    cashFlowResolution: PAYBACK_CASH_FLOW_RESOLUTION,
    paybackYears: round(officialPaybackYears, 2),
    paybackMonths: ceilPeriod(simplePaybackMonthsExact),
    simplePaybackYears: round(simplePaybackMonthsExact / 12, 2),
    simplePaybackMonths: ceilPeriod(simplePaybackMonthsExact),
    discountedPaybackYears: round(discountedPaybackMonthsExact / 12, 2),
    discountedPaybackMonths: ceilPeriod(discountedPaybackMonthsExact),
    netPresentValue: round(discountedCumulativeBalance),
    internalRateOfReturnPercent: internalRateOfReturnPercent == null ? null : round(internalRateOfReturnPercent, 2),
    lifetimeGrossSavings: round(lifetimeGrossSavings),
    lifetimeNetSavings: round(lifetimeNetSavings),
    totalOperationMaintenanceCost: round(totalOperationMaintenanceCost),
    totalReplacementCost: round(totalReplacementCost),
    firstYearGenerationKwh: round(firstYearGenerationKwh),
    lastYearGenerationKwh: round(lastYearGenerationKwh),
    analysisYears,
    annualTariffEscalationPercent: round(annualTariffEscalationPercent),
    annualGenerationDegradationPercent: round(annualGenerationDegradationPercent),
    annualOperationMaintenancePercent: round(annualOperationMaintenancePercent),
    discountRatePercent: round(discountRatePercent),
    compensationFactorPercent: round(compensationFactorPercent),
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    monthlyData: monthlyData.map((point) => ({
      ...point,
      generationKwh: round(point.generationKwh),
      compensableConsumptionKwh: round(point.compensableConsumptionKwh),
      compensatedEnergyKwh: round(point.compensatedEnergyKwh),
      tariffPerKwh: round(point.tariffPerKwh, 4),
      grossSavings: round(point.grossSavings),
      operationMaintenanceCost: round(point.operationMaintenanceCost),
      replacementCost: round(point.replacementCost),
      netCashFlow: round(point.netCashFlow),
      discountedCashFlow: round(point.discountedCashFlow),
      cumulativeBalance: round(point.cumulativeBalance),
      discountedCumulativeBalance: round(point.discountedCumulativeBalance),
    })),
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
