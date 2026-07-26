import {
  getRegulatoryChargePercent,
  round,
  type PaybackChartPoint,
  type RegulatoryFramework,
} from './paybackTypes';

export type FinancialProjectionInput = {
  totalInvestment: number;
  monthlyConsumptionKwh: number;
  monthlyGenerationKwh: number;
  effectiveTariffPerKwh: number;
  fioBComponentsPerKwh: number;
  regulatoryFramework: RegulatoryFramework;
  projectionStartYear: number;
  customRegulatoryChargePercent: number;
  postTransitionChargePercent: number;
  selfConsumptionPercent: number;
  annualTariffEscalationPercent: number;
  annualDegradationPercent: number;
  annualMaintenancePercent: number;
  annualDiscountRatePercent: number;
  inverterReplacementYear: number | null;
  inverterReplacementCost: number;
  projectionYears: number;
};

export type FinancialProjectionResult = {
  firstMonthDirectSelfConsumption: number;
  firstMonthGridCompensation: number;
  firstMonthGrossSavings: number;
  firstMonthRegulatoryCharge: number;
  firstMonthNetEnergySavings: number;
  annualSavings: number;
  annualOperatingCost: number;
  firstYearNetCashFlow: number;
  simplePaybackYears: number;
  paybackYears: number;
  paybackMonths: number;
  discountedPaybackYears: number;
  discountedPaybackMonths: number;
  netPresentValue: number;
  internalRateOfReturnPercent: number | null;
  projectedGrossSavings: number;
  projectedNetSavings: number;
  chartData: PaybackChartPoint[];
};

function calculateAnnualizedIrr(cashFlows: number[]) {
  if (cashFlows.length < 2 || cashFlows[0] >= 0 || !cashFlows.some((value) => value > 0)) return null;
  const npv = (rate: number) => cashFlows.reduce((total, flow, month) => (
    total + (month === 0 ? flow : flow / ((1 + rate) ** (month / 12)))
  ), 0);
  let low = -0.9999;
  let high = 1;
  let lowNpv = npv(low);
  let highNpv = npv(high);
  while (highNpv > 0 && high < 1_000_000) {
    high *= 2;
    highNpv = npv(high);
  }
  if (!Number.isFinite(lowNpv) || !Number.isFinite(highNpv) || lowNpv * highNpv > 0) return null;
  for (let i = 0; i < 180; i += 1) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid);
    if (Math.abs(midNpv) < 0.000001) return mid * 100;
    if (lowNpv * midNpv <= 0) high = mid;
    else {
      low = mid;
      lowNpv = midNpv;
    }
  }
  return ((low + high) / 2) * 100;
}

export function runFinancialProjection(input: FinancialProjectionInput): FinancialProjectionResult {
  const months = input.projectionYears * 12;
  const annualMaintenance = input.totalInvestment * input.annualMaintenancePercent / 100;
  const cashFlows = [-input.totalInvestment];
  const monthlyCashFlows: number[] = [];
  const nominalBalances = [-input.totalInvestment];
  const discountedBalances = [-input.totalInvestment];
  let nominal = -input.totalInvestment;
  let discounted = -input.totalInvestment;
  let paybackMonths = Number.POSITIVE_INFINITY;
  let discountedPaybackMonths = Number.POSITIVE_INFINITY;
  let projectedGrossSavings = 0;
  let annualSavings = 0;
  let annualOperatingCost = 0;
  let firstYearNetCashFlow = 0;
  let firstMonthDirectSelfConsumption = 0;
  let firstMonthGridCompensation = 0;
  let firstMonthGrossSavings = 0;
  let firstMonthRegulatoryCharge = 0;
  let firstMonthNetEnergySavings = 0;

  for (let month = 0; month < months; month += 1) {
    const elapsedYears = month / 12;
    const year = input.projectionStartYear + Math.floor(month / 12);
    const tariffFactor = (1 + input.annualTariffEscalationPercent / 100) ** elapsedYears;
    const generationFactor = (1 - input.annualDegradationPercent / 100) ** elapsedYears;
    const generation = input.monthlyGenerationKwh * generationFactor;
    const selfConsumed = Math.min(generation * input.selfConsumptionPercent / 100, input.monthlyConsumptionKwh);
    const gridCompensated = Math.min(
      Math.max(generation - selfConsumed, 0),
      Math.max(input.monthlyConsumptionKwh - selfConsumed, 0),
    );
    const grossSavings = (selfConsumed + gridCompensated) * input.effectiveTariffPerKwh * tariffFactor;
    const regulatoryPercent = getRegulatoryChargePercent(
      input.regulatoryFramework,
      year,
      input.customRegulatoryChargePercent,
      input.postTransitionChargePercent,
    );
    const regulatoryCharge = gridCompensated * input.fioBComponentsPerKwh * tariffFactor * regulatoryPercent / 100;
    const energySavings = Math.max(grossSavings - regulatoryCharge, 0);
    const operatingCost = annualMaintenance / 12;
    const replacementCost = input.inverterReplacementYear != null
      && month === (input.inverterReplacementYear * 12) - 1
      ? input.inverterReplacementCost
      : 0;
    const netFlow = energySavings - operatingCost - replacementCost;
    const discountedFlow = netFlow / ((1 + input.annualDiscountRatePercent / 100) ** ((month + 1) / 12));

    if (month === 0) {
      firstMonthDirectSelfConsumption = selfConsumed;
      firstMonthGridCompensation = gridCompensated;
      firstMonthGrossSavings = grossSavings;
      firstMonthRegulatoryCharge = regulatoryCharge;
      firstMonthNetEnergySavings = energySavings;
    }
    if (month < 12) {
      annualSavings += energySavings;
      annualOperatingCost += operatingCost;
      firstYearNetCashFlow += netFlow;
    }

    projectedGrossSavings += grossSavings;
    nominal += netFlow;
    discounted += discountedFlow;
    cashFlows.push(netFlow);
    monthlyCashFlows.push(netFlow);
    nominalBalances.push(nominal);
    discountedBalances.push(discounted);
    if (!Number.isFinite(paybackMonths) && nominal >= 0) paybackMonths = month + 1;
    if (!Number.isFinite(discountedPaybackMonths) && discounted >= 0) discountedPaybackMonths = month + 1;
  }

  const chartData: PaybackChartPoint[] = Array.from({ length: input.projectionYears + 1 }, (_, year) => {
    if (year === 0) return { year, cumulativeBalance: round(-input.totalInvestment), discountedCumulativeBalance: round(-input.totalInvestment), annualNetCashFlow: 0 };
    const end = year * 12;
    const annualNetCashFlow = monthlyCashFlows.slice(end - 12, end).reduce((sum, value) => sum + value, 0);
    return {
      year,
      cumulativeBalance: round(nominalBalances[end]),
      discountedCumulativeBalance: round(discountedBalances[end]),
      annualNetCashFlow: round(annualNetCashFlow),
    };
  });

  const simplePaybackYears = firstYearNetCashFlow > 0 ? input.totalInvestment / firstYearNetCashFlow : Number.POSITIVE_INFINITY;
  return {
    firstMonthDirectSelfConsumption,
    firstMonthGridCompensation,
    firstMonthGrossSavings,
    firstMonthRegulatoryCharge,
    firstMonthNetEnergySavings,
    annualSavings,
    annualOperatingCost,
    firstYearNetCashFlow,
    simplePaybackYears,
    paybackYears: Number.isFinite(paybackMonths) ? paybackMonths / 12 : Number.POSITIVE_INFINITY,
    paybackMonths,
    discountedPaybackYears: Number.isFinite(discountedPaybackMonths) ? discountedPaybackMonths / 12 : Number.POSITIVE_INFINITY,
    discountedPaybackMonths,
    netPresentValue: discounted,
    internalRateOfReturnPercent: calculateAnnualizedIrr(cashFlows),
    projectedGrossSavings,
    projectedNetSavings: nominal,
    chartData,
  };
}
