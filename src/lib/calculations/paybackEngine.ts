import {
  calculateDistributedGenerationCharge,
  type DistributedGenerationRegime,
} from './distributedGeneration';

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
  distributedGenerationRegime?: DistributedGenerationRegime | null;
  projectionStartYear?: number;
  projectionStartMonth?: number;
  simultaneousSelfConsumptionPercent?: number;
  fioBTariffCentsPerKwh?: number;
  fioATariffCentsPerKwh?: number;
  sectorChargesCentsPerKwh?: number;
  postTransitionFioBPercent?: number;
  postTransitionFioAPercent?: number;
  postTransitionSectorChargesPercent?: number;
};

export type PaybackMonthlyPoint = {
  month: number;
  year: number;
  monthOfYear: number;
  calendarYear: number;
  calendarMonth: number;
  generationKwh: number;
  compensableConsumptionKwh: number;
  compensatedEnergyKwh: number;
  selfConsumedEnergyKwh: number;
  gridCompensatedEnergyKwh: number;
  tariffPerKwh: number;
  grossSavings: number;
  fioBIncidencePercent: number;
  fioAIncidencePercent: number;
  sectorChargesIncidencePercent: number;
  fioBCharge: number;
  fioACharge: number;
  sectorCharges: number;
  distributedGenerationCharges: number;
  netSavingsAfterDistributedGenerationCharges: number;
  operationMaintenanceCost: number;
  replacementCost: number;
  netCashFlow: number;
  discountedCashFlow: number;
  cumulativeBalance: number;
  discountedCumulativeBalance: number;
  usesPostTransitionAssumption: boolean;
};

export type PaybackChartPoint = {
  year: number;
  generationKwh: number;
  selfConsumedEnergyKwh: number;
  gridCompensatedEnergyKwh: number;
  tariffPerKwh: number;
  grossSavings: number;
  distributedGenerationCharges: number;
  netSavingsAfterDistributedGenerationCharges: number;
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
  selfConsumedEnergyKwhPerMonth: number;
  gridCompensatedEnergyKwhPerMonth: number;
  monthlySavings: number;
  annualSavings: number;
  firstYearDistributedGenerationCharges: number;
  lifetimeDistributedGenerationCharges: number;
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
  distributedGenerationRegime: DistributedGenerationRegime | null;
  projectionStartYear: number | null;
  projectionStartMonth: number | null;
  simultaneousSelfConsumptionPercent: number;
  fioBTariffCentsPerKwh: number;
  fioATariffCentsPerKwh: number;
  sectorChargesCentsPerKwh: number;
  postTransitionFioBPercent: number;
  postTransitionFioAPercent: number;
  postTransitionSectorChargesPercent: number;
  usesPostTransitionAssumption: boolean;
  regulatoryWarnings: string[];
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
    selfConsumedEnergyKwh: 0,
    gridCompensatedEnergyKwh: 0,
    tariffPerKwh: initial.tariffPerKwh,
    grossSavings: 0,
    distributedGenerationCharges: 0,
    netSavingsAfterDistributedGenerationCharges: 0,
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
      selfConsumedEnergyKwh: sum(months.map((point) => point.selfConsumedEnergyKwh)),
      gridCompensatedEnergyKwh: sum(months.map((point) => point.gridCompensatedEnergyKwh)),
      tariffPerKwh: sum(months.map((point) => point.tariffPerKwh)) / months.length,
      grossSavings: sum(months.map((point) => point.grossSavings)),
      distributedGenerationCharges: sum(months.map((point) => point.distributedGenerationCharges)),
      netSavingsAfterDistributedGenerationCharges: sum(
        months.map((point) => point.netSavingsAfterDistributedGenerationCharges),
      ),
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

const resolveCalendarPeriod = (startYear: number, startMonth: number, period: number) => {
  const zeroBasedMonth = startMonth - 1 + Math.max(0, period - 1);
  return {
    calendarYear: startYear + Math.floor(zeroBasedMonth / 12),
    calendarMonth: (zeroBasedMonth % 12) + 1,
  };
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

  const distributedGenerationRegime = input.distributedGenerationRegime ?? null;
  const projectionStartYear = distributedGenerationRegime == null
    ? null
    : Math.trunc(input.projectionStartYear ?? 2026);
  const projectionStartMonth = distributedGenerationRegime == null
    ? null
    : Math.trunc(input.projectionStartMonth ?? 1);
  const simultaneousSelfConsumptionPercent = input.simultaneousSelfConsumptionPercent ?? 0;
  const fioBTariffCentsPerKwh = input.fioBTariffCentsPerKwh ?? 0;
  const fioATariffCentsPerKwh = input.fioATariffCentsPerKwh ?? 0;
  const sectorChargesCentsPerKwh = input.sectorChargesCentsPerKwh ?? 0;
  const postTransitionFioBPercent = input.postTransitionFioBPercent ?? 100;
  const postTransitionFioAPercent = input.postTransitionFioAPercent
    ?? (distributedGenerationRegime === 'gd3_special' ? 40 : 0);
  const postTransitionSectorChargesPercent = input.postTransitionSectorChargesPercent
    ?? (distributedGenerationRegime === 'gd3_special' ? 100 : 0);

  assertBetween(simultaneousSelfConsumptionPercent, 0, 100, 'Autoconsumo instantâneo');
  assertNonNegative(fioBTariffCentsPerKwh, 'Componente tarifária Fio B');
  assertNonNegative(fioATariffCentsPerKwh, 'Componente tarifária Fio A');
  assertNonNegative(sectorChargesCentsPerKwh, 'Encargos setoriais da GD especial');
  assertBetween(postTransitionFioBPercent, 0, 100, 'Incidência pós-transição do Fio B');
  assertBetween(postTransitionFioAPercent, 0, 100, 'Incidência pós-transição do Fio A');
  assertBetween(
    postTransitionSectorChargesPercent,
    0,
    100,
    'Incidência pós-transição dos encargos setoriais',
  );

  if (distributedGenerationRegime != null) {
    assertBetween(projectionStartYear ?? Number.NaN, 2020, 2100, 'Ano inicial da projeção');
    assertBetween(projectionStartMonth ?? Number.NaN, 1, 12, 'Mês inicial da projeção');
    if (distributedGenerationRegime !== 'gd1_grandfathered') {
      assertPositive(fioBTariffCentsPerKwh, 'Componente tarifária Fio B');
    }
    if (distributedGenerationRegime === 'gd3_special') {
      assertPositive(fioATariffCentsPerKwh, 'Componente tarifária Fio A');
      assertPositive(sectorChargesCentsPerKwh, 'Encargos P&D, EE e TFSEE');
    }
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
  const selfConsumptionFraction = simultaneousSelfConsumptionPercent / 100;
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
  let lifetimeDistributedGenerationCharges = 0;
  let totalOperationMaintenanceCost = 0;
  let totalReplacementCost = 0;

  const initialCalendarYear = projectionStartYear ?? 0;
  const initialCalendarMonth = projectionStartMonth ?? 0;
  const monthlyData: PaybackMonthlyPoint[] = [{
    month: 0,
    year: 0,
    monthOfYear: 0,
    calendarYear: initialCalendarYear,
    calendarMonth: initialCalendarMonth,
    generationKwh: 0,
    compensableConsumptionKwh: 0,
    compensatedEnergyKwh: 0,
    selfConsumedEnergyKwh: 0,
    gridCompensatedEnergyKwh: 0,
    tariffPerKwh: effectiveTariffPerKwh,
    grossSavings: 0,
    fioBIncidencePercent: 0,
    fioAIncidencePercent: 0,
    sectorChargesIncidencePercent: 0,
    fioBCharge: 0,
    fioACharge: 0,
    sectorCharges: 0,
    distributedGenerationCharges: 0,
    netSavingsAfterDistributedGenerationCharges: 0,
    operationMaintenanceCost: 0,
    replacementCost: 0,
    netCashFlow: -input.proposalPrice,
    discountedCashFlow: -input.proposalPrice,
    cumulativeBalance,
    discountedCumulativeBalance,
    usesPostTransitionAssumption: false,
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
    const selfConsumedEnergyKwh = compensatedEnergyKwh * selfConsumptionFraction;
    const gridCompensatedEnergyKwh = compensatedEnergyKwh - selfConsumedEnergyKwh;
    const tariffEscalationFactor = (1 + monthlyTariffEscalationRate) ** (month - 1);
    const tariffPerKwh = effectiveTariffPerKwh * tariffEscalationFactor;
    const grossSavings = compensatedEnergyKwh * tariffPerKwh;

    const calendarPeriod = distributedGenerationRegime == null
      ? { calendarYear: 0, calendarMonth: 0 }
      : resolveCalendarPeriod(projectionStartYear ?? 2026, projectionStartMonth ?? 1, month);
    const distributedGeneration = distributedGenerationRegime == null
      ? {
          fioBPercent: 0,
          fioAPercent: 0,
          sectorChargesPercent: 0,
          fioBCharge: 0,
          fioACharge: 0,
          sectorCharges: 0,
          totalCharge: 0,
          isPostTransitionAssumption: false,
        }
      : calculateDistributedGenerationCharge({
          regime: distributedGenerationRegime,
          calendarYear: calendarPeriod.calendarYear,
          gridCompensatedEnergyKwh,
          tariffEscalationFactor,
          fioBTariffCentsPerKwh,
          fioATariffCentsPerKwh,
          sectorChargesCentsPerKwh,
          postTransitionFioBPercent,
          postTransitionFioAPercent,
          postTransitionSectorChargesPercent,
        });
    const netSavingsAfterDistributedGenerationCharges = grossSavings - distributedGeneration.totalCharge;
    const replacementCost = inverterReplacementCost > 0 && replacementMonth === month
      ? inverterReplacementCost
      : 0;
    const netCashFlow = netSavingsAfterDistributedGenerationCharges
      - monthlyOperationMaintenanceCost
      - replacementCost;
    const discountedCashFlow = netCashFlow / ((1 + monthlyDiscountRate) ** month);

    cumulativeBalance += netCashFlow;
    discountedCumulativeBalance += discountedCashFlow;
    lifetimeGrossSavings += grossSavings;
    lifetimeNetSavings += netCashFlow;
    lifetimeDistributedGenerationCharges += distributedGeneration.totalCharge;
    totalOperationMaintenanceCost += monthlyOperationMaintenanceCost;
    totalReplacementCost += replacementCost;
    cashFlows.push(netCashFlow);

    monthlyData.push({
      month,
      year,
      monthOfYear,
      calendarYear: calendarPeriod.calendarYear,
      calendarMonth: calendarPeriod.calendarMonth,
      generationKwh,
      compensableConsumptionKwh,
      compensatedEnergyKwh,
      selfConsumedEnergyKwh,
      gridCompensatedEnergyKwh,
      tariffPerKwh,
      grossSavings,
      fioBIncidencePercent: distributedGeneration.fioBPercent,
      fioAIncidencePercent: distributedGeneration.fioAPercent,
      sectorChargesIncidencePercent: distributedGeneration.sectorChargesPercent,
      fioBCharge: distributedGeneration.fioBCharge,
      fioACharge: distributedGeneration.fioACharge,
      sectorCharges: distributedGeneration.sectorCharges,
      distributedGenerationCharges: distributedGeneration.totalCharge,
      netSavingsAfterDistributedGenerationCharges,
      operationMaintenanceCost: monthlyOperationMaintenanceCost,
      replacementCost,
      netCashFlow,
      discountedCashFlow,
      cumulativeBalance,
      discountedCumulativeBalance,
      usesPostTransitionAssumption: distributedGeneration.isPostTransitionAssumption,
    });
  }

  const firstYearMonths = monthlyData.slice(1, 13);
  const lastYearMonths = monthlyData.slice(-12);
  if (firstYearMonths.length !== 12 || lastYearMonths.length !== 12) {
    throw new Error('Não foi possível projetar o fluxo de caixa mensal.');
  }

  const annualSavings = sum(
    firstYearMonths.map((point) => point.netSavingsAfterDistributedGenerationCharges),
  );
  const monthlySavings = annualSavings / 12;
  const compensatedEnergyKwhPerMonth = sum(
    firstYearMonths.map((point) => point.compensatedEnergyKwh),
  ) / 12;
  const selfConsumedEnergyKwhPerMonth = sum(
    firstYearMonths.map((point) => point.selfConsumedEnergyKwh),
  ) / 12;
  const gridCompensatedEnergyKwhPerMonth = sum(
    firstYearMonths.map((point) => point.gridCompensatedEnergyKwh),
  ) / 12;
  const firstYearDistributedGenerationCharges = sum(
    firstYearMonths.map((point) => point.distributedGenerationCharges),
  );
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
  const usesPostTransitionAssumption = monthlyData.some((point) => point.usesPostTransitionAssumption);
  const regulatoryWarnings: string[] = [];
  if (usesPostTransitionAssumption) {
    regulatoryWarnings.push(
      'A projeção após o período legal de transição usa percentuais editáveis e deve ser revisada conforme a regulamentação vigente da ANEEL.',
    );
  }
  if (distributedGenerationRegime == null) {
    regulatoryWarnings.push(
      'O enquadramento da geração distribuída não foi informado; nenhuma cobrança regulatória de uso da rede foi aplicada.',
    );
  }

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
    selfConsumedEnergyKwhPerMonth: round(selfConsumedEnergyKwhPerMonth),
    gridCompensatedEnergyKwhPerMonth: round(gridCompensatedEnergyKwhPerMonth),
    monthlySavings: round(monthlySavings),
    annualSavings: round(annualSavings),
    firstYearDistributedGenerationCharges: round(firstYearDistributedGenerationCharges),
    lifetimeDistributedGenerationCharges: round(lifetimeDistributedGenerationCharges),
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
    distributedGenerationRegime,
    projectionStartYear,
    projectionStartMonth,
    simultaneousSelfConsumptionPercent: round(simultaneousSelfConsumptionPercent),
    fioBTariffCentsPerKwh: round(fioBTariffCentsPerKwh, 4),
    fioATariffCentsPerKwh: round(fioATariffCentsPerKwh, 4),
    sectorChargesCentsPerKwh: round(sectorChargesCentsPerKwh, 4),
    postTransitionFioBPercent: round(postTransitionFioBPercent),
    postTransitionFioAPercent: round(postTransitionFioAPercent),
    postTransitionSectorChargesPercent: round(postTransitionSectorChargesPercent),
    usesPostTransitionAssumption,
    regulatoryWarnings,
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    monthlyData: monthlyData.map((point) => ({
      ...point,
      generationKwh: round(point.generationKwh),
      compensableConsumptionKwh: round(point.compensableConsumptionKwh),
      compensatedEnergyKwh: round(point.compensatedEnergyKwh),
      selfConsumedEnergyKwh: round(point.selfConsumedEnergyKwh),
      gridCompensatedEnergyKwh: round(point.gridCompensatedEnergyKwh),
      tariffPerKwh: round(point.tariffPerKwh, 4),
      grossSavings: round(point.grossSavings),
      fioBCharge: round(point.fioBCharge),
      fioACharge: round(point.fioACharge),
      sectorCharges: round(point.sectorCharges),
      distributedGenerationCharges: round(point.distributedGenerationCharges),
      netSavingsAfterDistributedGenerationCharges: round(
        point.netSavingsAfterDistributedGenerationCharges,
      ),
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
      selfConsumedEnergyKwh: round(point.selfConsumedEnergyKwh),
      gridCompensatedEnergyKwh: round(point.gridCompensatedEnergyKwh),
      tariffPerKwh: round(point.tariffPerKwh, 4),
      grossSavings: round(point.grossSavings),
      distributedGenerationCharges: round(point.distributedGenerationCharges),
      netSavingsAfterDistributedGenerationCharges: round(
        point.netSavingsAfterDistributedGenerationCharges,
      ),
      operationMaintenanceCost: round(point.operationMaintenanceCost),
      replacementCost: round(point.replacementCost),
      netCashFlow: round(point.netCashFlow),
      discountedCashFlow: round(point.discountedCashFlow),
      cumulativeBalance: round(point.cumulativeBalance),
      discountedCumulativeBalance: round(point.discountedCumulativeBalance),
    })),
  };
}
