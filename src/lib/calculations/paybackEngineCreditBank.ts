import {
  calculatePayback as calculateLegacyPayback,
  classifyPayback,
  OFFICIAL_PAYBACK_METHOD,
  PAYBACK_CASH_FLOW_RESOLUTION,
  PAYBACK_STATUS_LABELS,
  type BillReferenceStatus,
  type OfficialPaybackMethod,
  type PaybackAdditionalCost,
  type PaybackCashFlowResolution,
  type PaybackChartPoint as LegacyPaybackChartPoint,
  type PaybackInput as LegacyPaybackInput,
  type PaybackMonthlyPoint as LegacyPaybackMonthlyPoint,
  type PaybackResult as LegacyPaybackResult,
  type PaybackStatus,
} from './paybackEngine';
import {
  calculateDistributedGenerationCharge,
  type DistributedGenerationRegime,
} from './distributedGeneration';

export {
  OFFICIAL_PAYBACK_METHOD,
  PAYBACK_CASH_FLOW_RESOLUTION,
  PAYBACK_STATUS_LABELS,
  classifyPayback,
};
export type {
  BillReferenceStatus,
  OfficialPaybackMethod,
  PaybackAdditionalCost,
  PaybackCashFlowResolution,
  PaybackStatus,
};

export const ENERGY_CREDIT_VALIDITY_MONTHS = 60 as const;

export type PaybackInput = LegacyPaybackInput & {
  initialCreditBalanceKwh?: number;
  initialCreditAgeMonths?: number;
};

export type PaybackMonthlyPoint = Omit<
  LegacyPaybackMonthlyPoint,
  | 'selfConsumedEnergyKwh'
  | 'gridCompensatedEnergyKwh'
  | 'compensatedEnergyKwh'
  | 'grossSavings'
  | 'fioBCharge'
  | 'fioACharge'
  | 'sectorCharges'
  | 'distributedGenerationCharges'
  | 'netSavingsAfterDistributedGenerationCharges'
  | 'netCashFlow'
  | 'discountedCashFlow'
  | 'cumulativeBalance'
  | 'discountedCumulativeBalance'
  | 'usesPostTransitionAssumption'
> & {
  selfConsumedEnergyKwh: number;
  injectedEnergyKwh: number;
  gridConsumptionBeforeCompensationKwh: number;
  creditsGeneratedKwh: number;
  creditsUsedKwh: number;
  expiredCreditsKwh: number;
  creditBalanceKwh: number;
  uncompensatedGridConsumptionKwh: number;
  economicGridCompensatedEnergyKwh: number;
  gridCompensatedEnergyKwh: number;
  compensatedEnergyKwh: number;
  grossSavings: number;
  fioBCharge: number;
  fioACharge: number;
  sectorCharges: number;
  distributedGenerationCharges: number;
  netSavingsAfterDistributedGenerationCharges: number;
  netCashFlow: number;
  discountedCashFlow: number;
  cumulativeBalance: number;
  discountedCumulativeBalance: number;
  usesPostTransitionAssumption: boolean;
};

export type PaybackChartPoint = LegacyPaybackChartPoint & {
  injectedEnergyKwh: number;
  creditsGeneratedKwh: number;
  creditsUsedKwh: number;
  expiredCreditsKwh: number;
  creditBalanceKwh: number;
  uncompensatedGridConsumptionKwh: number;
};

export type PaybackResult = Omit<
  LegacyPaybackResult,
  | 'monthlyData'
  | 'chartData'
  | 'compensatedEnergyKwhPerMonth'
  | 'selfConsumedEnergyKwhPerMonth'
  | 'gridCompensatedEnergyKwhPerMonth'
  | 'monthlySavings'
  | 'annualSavings'
  | 'firstYearDistributedGenerationCharges'
  | 'lifetimeDistributedGenerationCharges'
  | 'paybackYears'
  | 'paybackMonths'
  | 'simplePaybackYears'
  | 'simplePaybackMonths'
  | 'discountedPaybackYears'
  | 'discountedPaybackMonths'
  | 'netPresentValue'
  | 'internalRateOfReturnPercent'
  | 'lifetimeGrossSavings'
  | 'lifetimeNetSavings'
  | 'estimatedResidualBillAmount'
  | 'estimatedBillReductionPercent'
  | 'usesPostTransitionAssumption'
  | 'regulatoryWarnings'
  | 'status'
  | 'statusLabel'
> & {
  compensatedEnergyKwhPerMonth: number;
  selfConsumedEnergyKwhPerMonth: number;
  injectedEnergyKwhPerMonth: number;
  gridCompensatedEnergyKwhPerMonth: number;
  creditsGeneratedKwhPerMonth: number;
  creditsUsedKwhPerMonth: number;
  uncompensatedGridConsumptionKwhPerMonth: number;
  creditBalanceEndFirstYearKwh: number;
  creditBalanceEndHorizonKwh: number;
  maxCreditBalanceKwh: number;
  firstYearExpiredCreditsKwh: number;
  lifetimeExpiredCreditsKwh: number;
  creditValidityMonths: typeof ENERGY_CREDIT_VALIDITY_MONTHS;
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
  estimatedResidualBillAmount: number | null;
  estimatedBillReductionPercent: number | null;
  usesPostTransitionAssumption: boolean;
  regulatoryWarnings: string[];
  status: PaybackStatus;
  statusLabel: string;
  monthlyData: PaybackMonthlyPoint[];
  chartData: PaybackChartPoint[];
};

type CreditLot = { originMonth: number; remainingKwh: number };

const round = (value: number, decimals = 2) => {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const annualRateToMonthlyRate = (annualPercent: number) => (
  (1 + annualPercent / 100) ** (1 / 12) - 1
);
const ceilPeriod = (value: number) => (
  Number.isFinite(value) ? Math.ceil(value - 0.000000001) : Number.POSITIVE_INFINITY
);

const assertInitialCredit = (balance: number, age: number) => {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error('Saldo inicial de créditos deve ser igual ou maior que zero.');
  }
  if (!Number.isInteger(age) || age < 0 || age >= ENERGY_CREDIT_VALIDITY_MONTHS) {
    throw new Error(`Idade do crédito inicial deve estar entre 0 e ${ENERGY_CREDIT_VALIDITY_MONTHS - 1}.`);
  }
};

const rotateProfileForStart = (
  profile: number[] | null | undefined,
  startMonth: number | undefined,
) => {
  if (profile == null || profile.length !== 12 || startMonth == null) return profile;
  const offset = Math.max(0, Math.min(11, Math.trunc(startMonth) - 1));
  return [...profile.slice(offset), ...profile.slice(0, offset)];
};

const expireCreditLots = (creditLots: CreditLot[], currentMonth: number) => {
  let expiredCreditsKwh = 0;
  const activeLots: CreditLot[] = [];
  for (const lot of creditLots) {
    if (currentMonth - lot.originMonth >= ENERGY_CREDIT_VALIDITY_MONTHS) {
      expiredCreditsKwh += lot.remainingKwh;
    } else if (lot.remainingKwh > 0.000000001) {
      activeLots.push(lot);
    }
  }
  return { activeLots, expiredCreditsKwh };
};

const consumeOldestCredits = (creditLots: CreditLot[], requestedKwh: number) => {
  let remainingRequest = Math.max(0, requestedKwh);
  let creditsUsedKwh = 0;
  for (const lot of creditLots) {
    if (remainingRequest <= 0.000000001) break;
    const used = Math.min(lot.remainingKwh, remainingRequest);
    lot.remainingKwh -= used;
    remainingRequest -= used;
    creditsUsedKwh += used;
  }
  return {
    activeLots: creditLots.filter((lot) => lot.remainingKwh > 0.000000001),
    creditsUsedKwh,
  };
};

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

const calculatePeriodicIrr = (cashFlows: number[]) => {
  const npvAt = (rate: number) => cashFlows.reduce(
    (total, cashFlow, period) => total + cashFlow / ((1 + rate) ** period),
    0,
  );
  const candidates = [-0.9, -0.5, -0.25, -0.1, -0.05, -0.01, 0, 0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  let previousRate: number | null = null;
  let previousValue: number | null = null;
  let lower: number | null = null;
  let upper: number | null = null;
  for (const rate of candidates) {
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
    const midpoint: number = (lowerBound + upperBound) / 2;
    const midpointValue = npvAt(midpoint);
    if (!Number.isFinite(midpointValue)) return null;
    if (Math.abs(midpointValue) < 0.000001) return midpoint;
    if (lowerValue * midpointValue <= 0) upperBound = midpoint;
    else {
      lowerBound = midpoint;
      lowerValue = midpointValue;
    }
  }
  return (lowerBound + upperBound) / 2;
};

const aggregateAnnualChart = (
  monthlyData: PaybackMonthlyPoint[],
  legacyChartData: LegacyPaybackChartPoint[],
  analysisYears: number,
): PaybackChartPoint[] => {
  const initial = monthlyData[0];
  const legacyInitial = legacyChartData[0];
  if (!initial || !legacyInitial) throw new Error('Não foi possível iniciar o fluxo de caixa mensal.');
  const chartData: PaybackChartPoint[] = [{
    ...legacyInitial,
    injectedEnergyKwh: 0,
    creditsGeneratedKwh: 0,
    creditsUsedKwh: 0,
    expiredCreditsKwh: 0,
    creditBalanceKwh: initial.creditBalanceKwh,
    uncompensatedGridConsumptionKwh: 0,
    cumulativeBalance: initial.cumulativeBalance,
    discountedCumulativeBalance: initial.discountedCumulativeBalance,
  }];
  for (let year = 1; year <= analysisYears; year += 1) {
    const months = monthlyData.slice((year - 1) * 12 + 1, year * 12 + 1);
    const lastMonth = months.at(-1);
    const legacyPoint = legacyChartData[year];
    if (months.length !== 12 || !lastMonth || !legacyPoint) {
      throw new Error(`Não foi possível consolidar o ano ${year} do fluxo de caixa.`);
    }
    chartData.push({
      ...legacyPoint,
      generationKwh: sum(months.map((point) => point.generationKwh)),
      selfConsumedEnergyKwh: sum(months.map((point) => point.selfConsumedEnergyKwh)),
      injectedEnergyKwh: sum(months.map((point) => point.injectedEnergyKwh)),
      gridCompensatedEnergyKwh: sum(months.map((point) => point.gridCompensatedEnergyKwh)),
      creditsGeneratedKwh: sum(months.map((point) => point.creditsGeneratedKwh)),
      creditsUsedKwh: sum(months.map((point) => point.creditsUsedKwh)),
      expiredCreditsKwh: sum(months.map((point) => point.expiredCreditsKwh)),
      creditBalanceKwh: lastMonth.creditBalanceKwh,
      uncompensatedGridConsumptionKwh: sum(months.map((point) => point.uncompensatedGridConsumptionKwh)),
      grossSavings: sum(months.map((point) => point.grossSavings)),
      distributedGenerationCharges: sum(months.map((point) => point.distributedGenerationCharges)),
      netSavingsAfterDistributedGenerationCharges: sum(months.map((point) => point.netSavingsAfterDistributedGenerationCharges)),
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

export function calculatePayback(input: PaybackInput): PaybackResult {
  const initialCreditBalanceKwh = input.initialCreditBalanceKwh ?? 0;
  const initialCreditAgeMonths = Math.trunc(input.initialCreditAgeMonths ?? 0);
  assertInitialCredit(initialCreditBalanceKwh, initialCreditAgeMonths);

  const alignedInput: LegacyPaybackInput = {
    ...input,
    monthlyCompensableConsumptionProfileKwh: rotateProfileForStart(
      input.monthlyCompensableConsumptionProfileKwh,
      input.distributedGenerationRegime == null ? undefined : input.projectionStartMonth,
    ),
    monthlyGenerationProfileKwh: rotateProfileForStart(
      input.monthlyGenerationProfileKwh,
      input.distributedGenerationRegime == null ? undefined : input.projectionStartMonth,
    ),
  };
  const legacy = calculateLegacyPayback(alignedInput);
  const selfConsumptionFraction = legacy.simultaneousSelfConsumptionPercent / 100;
  const compensationFraction = legacy.compensationFactorPercent / 100;
  const monthlyDiscountRate = annualRateToMonthlyRate(legacy.discountRatePercent);
  const regime: DistributedGenerationRegime | null = legacy.distributedGenerationRegime;

  let creditLots: CreditLot[] = initialCreditBalanceKwh > 0
    ? [{ originMonth: 1 - initialCreditAgeMonths, remainingKwh: initialCreditBalanceKwh }]
    : [];
  let cumulativeBalance = -legacy.totalInvestment;
  let discountedCumulativeBalance = -legacy.totalInvestment;
  let lifetimeGrossSavings = 0;
  let lifetimeNetSavings = 0;
  let lifetimeDistributedGenerationCharges = 0;
  let lifetimeExpiredCreditsKwh = 0;
  let maxCreditBalanceKwh = initialCreditBalanceKwh;
  const cashFlows = [-legacy.totalInvestment];

  const initialLegacy = legacy.monthlyData[0];
  if (!initialLegacy) throw new Error('Não foi possível iniciar o fluxo de caixa mensal.');
  const monthlyData: PaybackMonthlyPoint[] = [{
    ...initialLegacy,
    injectedEnergyKwh: 0,
    gridConsumptionBeforeCompensationKwh: 0,
    creditsGeneratedKwh: 0,
    creditsUsedKwh: 0,
    expiredCreditsKwh: 0,
    creditBalanceKwh: initialCreditBalanceKwh,
    uncompensatedGridConsumptionKwh: 0,
    economicGridCompensatedEnergyKwh: 0,
    cumulativeBalance,
    discountedCumulativeBalance,
  }];

  for (const legacyPoint of legacy.monthlyData.slice(1)) {
    const expiration = expireCreditLots(creditLots, legacyPoint.month);
    creditLots = expiration.activeLots;
    const potentialSelfConsumption = legacyPoint.generationKwh * selfConsumptionFraction;
    const selfConsumedEnergyKwh = Math.min(legacyPoint.compensableConsumptionKwh, potentialSelfConsumption);
    const injectedEnergyKwh = Math.max(0, legacyPoint.generationKwh - selfConsumedEnergyKwh);
    const gridConsumptionBeforeCompensationKwh = Math.max(0, legacyPoint.compensableConsumptionKwh - selfConsumedEnergyKwh);
    if (injectedEnergyKwh > 0.000000001) {
      creditLots.push({ originMonth: legacyPoint.month, remainingKwh: injectedEnergyKwh });
    }
    const usage = consumeOldestCredits(creditLots, gridConsumptionBeforeCompensationKwh);
    creditLots = usage.activeLots;
    const creditsUsedKwh = usage.creditsUsedKwh;
    const creditBalanceKwh = sum(creditLots.map((lot) => lot.remainingKwh));
    const uncompensatedGridConsumptionKwh = Math.max(0, gridConsumptionBeforeCompensationKwh - creditsUsedKwh);
    const economicGridCompensatedEnergyKwh = creditsUsedKwh * compensationFraction;
    const compensatedEnergyKwh = selfConsumedEnergyKwh + economicGridCompensatedEnergyKwh;
    const grossSavings = compensatedEnergyKwh * legacyPoint.tariffPerKwh;
    const tariffEscalationFactor = legacyPoint.tariffPerKwh / Math.max(legacy.effectiveTariffPerKwh, 0.000000001);
    const distributedGeneration = regime == null
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
          regime,
          calendarYear: legacyPoint.calendarYear,
          gridCompensatedEnergyKwh: creditsUsedKwh,
          tariffEscalationFactor,
          fioBTariffCentsPerKwh: legacy.fioBTariffCentsPerKwh,
          fioATariffCentsPerKwh: legacy.fioATariffCentsPerKwh,
          sectorChargesCentsPerKwh: legacy.sectorChargesCentsPerKwh,
          postTransitionFioBPercent: legacy.postTransitionFioBPercent,
          postTransitionFioAPercent: legacy.postTransitionFioAPercent,
          postTransitionSectorChargesPercent: legacy.postTransitionSectorChargesPercent,
        });
    const netSavingsAfterDistributedGenerationCharges = grossSavings - distributedGeneration.totalCharge;
    const netCashFlow = netSavingsAfterDistributedGenerationCharges
      - legacyPoint.operationMaintenanceCost
      - legacyPoint.replacementCost;
    const discountedCashFlow = netCashFlow / ((1 + monthlyDiscountRate) ** legacyPoint.month);
    cumulativeBalance += netCashFlow;
    discountedCumulativeBalance += discountedCashFlow;
    lifetimeGrossSavings += grossSavings;
    lifetimeNetSavings += netCashFlow;
    lifetimeDistributedGenerationCharges += distributedGeneration.totalCharge;
    lifetimeExpiredCreditsKwh += expiration.expiredCreditsKwh;
    maxCreditBalanceKwh = Math.max(maxCreditBalanceKwh, creditBalanceKwh);
    cashFlows.push(netCashFlow);

    monthlyData.push({
      ...legacyPoint,
      selfConsumedEnergyKwh,
      injectedEnergyKwh,
      gridConsumptionBeforeCompensationKwh,
      creditsGeneratedKwh: injectedEnergyKwh,
      creditsUsedKwh,
      expiredCreditsKwh: expiration.expiredCreditsKwh,
      creditBalanceKwh,
      uncompensatedGridConsumptionKwh,
      economicGridCompensatedEnergyKwh,
      gridCompensatedEnergyKwh: creditsUsedKwh,
      compensatedEnergyKwh,
      grossSavings,
      fioBIncidencePercent: distributedGeneration.fioBPercent,
      fioAIncidencePercent: distributedGeneration.fioAPercent,
      sectorChargesIncidencePercent: distributedGeneration.sectorChargesPercent,
      fioBCharge: distributedGeneration.fioBCharge,
      fioACharge: distributedGeneration.fioACharge,
      sectorCharges: distributedGeneration.sectorCharges,
      distributedGenerationCharges: distributedGeneration.totalCharge,
      netSavingsAfterDistributedGenerationCharges,
      netCashFlow,
      discountedCashFlow,
      cumulativeBalance,
      discountedCumulativeBalance,
      usesPostTransitionAssumption: distributedGeneration.isPostTransitionAssumption,
    });
  }

  const firstYearMonths = monthlyData.slice(1, 13);
  const annualSavings = sum(firstYearMonths.map((point) => point.netSavingsAfterDistributedGenerationCharges));
  const monthlySavings = annualSavings / 12;
  const average = (field: keyof PaybackMonthlyPoint) => (
    sum(firstYearMonths.map((point) => Number(point[field]))) / 12
  );
  const creditBalanceEndFirstYearKwh = firstYearMonths.at(-1)?.creditBalanceKwh ?? 0;
  const creditBalanceEndHorizonKwh = monthlyData.at(-1)?.creditBalanceKwh ?? 0;
  const firstYearExpiredCreditsKwh = sum(firstYearMonths.map((point) => point.expiredCreditsKwh));
  const firstYearDistributedGenerationCharges = sum(firstYearMonths.map((point) => point.distributedGenerationCharges));
  const simplePaybackMonthsExact = crossingPeriods(monthlyData, 'cumulativeBalance');
  const discountedPaybackMonthsExact = crossingPeriods(monthlyData, 'discountedCumulativeBalance');
  const officialPaybackYears = simplePaybackMonthsExact / 12;
  const status = classifyPayback(officialPaybackYears);
  const monthlyIrr = calculatePeriodicIrr(cashFlows);
  const internalRateOfReturnPercent = monthlyIrr == null
    ? null
    : (((1 + monthlyIrr) ** 12) - 1) * 100;
  const usesPostTransitionAssumption = monthlyData.some((point) => point.usesPostTransitionAssumption);
  const regulatoryWarnings = [...legacy.regulatoryWarnings];
  if (lifetimeExpiredCreditsKwh > 0) {
    regulatoryWarnings.push(
      `A projeção indica ${round(lifetimeExpiredCreditsKwh)} kWh de créditos expirados após ${ENERGY_CREDIT_VALIDITY_MONTHS} meses. Revise o dimensionamento ou a alocação dos excedentes.`,
    );
  }
  if (creditBalanceEndHorizonKwh > 0) {
    regulatoryWarnings.push(
      `O horizonte termina com ${round(creditBalanceEndHorizonKwh)} kWh no banco de créditos; esse saldo não foi convertido em economia fora da projeção.`,
    );
  }

  const minimumResidualBillAmount = (input.monthlyAvailabilityConsumptionKwh ?? 0) * legacy.effectiveTariffPerKwh;
  const estimatedResidualBillAmount = legacy.averageMonthlyBillAmount == null
    ? null
    : Math.min(
        legacy.averageMonthlyBillAmount,
        Math.max(legacy.averageMonthlyBillAmount - monthlySavings, minimumResidualBillAmount),
      );
  const estimatedBillReductionPercent = legacy.averageMonthlyBillAmount == null || estimatedResidualBillAmount == null
    ? null
    : ((legacy.averageMonthlyBillAmount - estimatedResidualBillAmount) / legacy.averageMonthlyBillAmount) * 100;
  const chartData = aggregateAnnualChart(monthlyData, legacy.chartData, legacy.analysisYears);

  return {
    ...legacy,
    compensatedEnergyKwhPerMonth: round(average('compensatedEnergyKwh')),
    selfConsumedEnergyKwhPerMonth: round(average('selfConsumedEnergyKwh')),
    injectedEnergyKwhPerMonth: round(average('injectedEnergyKwh')),
    gridCompensatedEnergyKwhPerMonth: round(average('gridCompensatedEnergyKwh')),
    creditsGeneratedKwhPerMonth: round(average('creditsGeneratedKwh')),
    creditsUsedKwhPerMonth: round(average('creditsUsedKwh')),
    uncompensatedGridConsumptionKwhPerMonth: round(average('uncompensatedGridConsumptionKwh')),
    creditBalanceEndFirstYearKwh: round(creditBalanceEndFirstYearKwh),
    creditBalanceEndHorizonKwh: round(creditBalanceEndHorizonKwh),
    maxCreditBalanceKwh: round(maxCreditBalanceKwh),
    firstYearExpiredCreditsKwh: round(firstYearExpiredCreditsKwh),
    lifetimeExpiredCreditsKwh: round(lifetimeExpiredCreditsKwh),
    creditValidityMonths: ENERGY_CREDIT_VALIDITY_MONTHS,
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
    estimatedResidualBillAmount: estimatedResidualBillAmount == null ? null : round(estimatedResidualBillAmount),
    estimatedBillReductionPercent: estimatedBillReductionPercent == null ? null : round(estimatedBillReductionPercent),
    usesPostTransitionAssumption,
    regulatoryWarnings,
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    monthlyData: monthlyData.map((point) => ({
      ...point,
      selfConsumedEnergyKwh: round(point.selfConsumedEnergyKwh),
      injectedEnergyKwh: round(point.injectedEnergyKwh),
      gridConsumptionBeforeCompensationKwh: round(point.gridConsumptionBeforeCompensationKwh),
      creditsGeneratedKwh: round(point.creditsGeneratedKwh),
      creditsUsedKwh: round(point.creditsUsedKwh),
      expiredCreditsKwh: round(point.expiredCreditsKwh),
      creditBalanceKwh: round(point.creditBalanceKwh),
      uncompensatedGridConsumptionKwh: round(point.uncompensatedGridConsumptionKwh),
      economicGridCompensatedEnergyKwh: round(point.economicGridCompensatedEnergyKwh),
      gridCompensatedEnergyKwh: round(point.gridCompensatedEnergyKwh),
      compensatedEnergyKwh: round(point.compensatedEnergyKwh),
      grossSavings: round(point.grossSavings),
      fioBCharge: round(point.fioBCharge),
      fioACharge: round(point.fioACharge),
      sectorCharges: round(point.sectorCharges),
      distributedGenerationCharges: round(point.distributedGenerationCharges),
      netSavingsAfterDistributedGenerationCharges: round(point.netSavingsAfterDistributedGenerationCharges),
      netCashFlow: round(point.netCashFlow),
      discountedCashFlow: round(point.discountedCashFlow),
      cumulativeBalance: round(point.cumulativeBalance),
      discountedCumulativeBalance: round(point.discountedCumulativeBalance),
    })),
    chartData: chartData.map((point) => ({
      ...point,
      generationKwh: round(point.generationKwh),
      selfConsumedEnergyKwh: round(point.selfConsumedEnergyKwh),
      injectedEnergyKwh: round(point.injectedEnergyKwh),
      gridCompensatedEnergyKwh: round(point.gridCompensatedEnergyKwh),
      creditsGeneratedKwh: round(point.creditsGeneratedKwh),
      creditsUsedKwh: round(point.creditsUsedKwh),
      expiredCreditsKwh: round(point.expiredCreditsKwh),
      creditBalanceKwh: round(point.creditBalanceKwh),
      uncompensatedGridConsumptionKwh: round(point.uncompensatedGridConsumptionKwh),
      grossSavings: round(point.grossSavings),
      distributedGenerationCharges: round(point.distributedGenerationCharges),
      netSavingsAfterDistributedGenerationCharges: round(point.netSavingsAfterDistributedGenerationCharges),
      operationMaintenanceCost: round(point.operationMaintenanceCost),
      replacementCost: round(point.replacementCost),
      netCashFlow: round(point.netCashFlow),
      discountedCashFlow: round(point.discountedCashFlow),
      cumulativeBalance: round(point.cumulativeBalance),
      discountedCumulativeBalance: round(point.discountedCumulativeBalance),
    })),
  };
}
