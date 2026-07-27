export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'unfeasible';
export type BillReferenceStatus = 'not_informed' | 'consistent' | 'review';
export type TariffTaxMode = 'add_percentages' | 'already_included';
export type RegulatoryFramework = 'gd1' | 'transition' | 'custom';

export const PAYBACK_CALCULATION_VERSION = 1 as const;

export type PaybackAdditionalCost = { description: string; amount: number };

export type PaybackInput = {
  kitCost: number;
  marginPercentage: number;
  tariffCentsPerKwh: number;
  tariffTaxMode?: TariffTaxMode;
  averageMonthlyBillAmount?: number | null;
  monthlyAvailabilityConsumptionKwh?: number;
  pisPercent: number;
  cofinsPercent: number;
  icmsPercent: number;
  otherTariffsPercent: number;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  additionalCosts: PaybackAdditionalCost[];
  regulatoryFramework?: RegulatoryFramework;
  projectionStartYear?: number;
  fioBComponentsCentsPerKwh?: number;
  customRegulatoryChargePercent?: number;
  postTransitionChargePercent?: number;
  selfConsumptionPercent?: number;
  annualTariffEscalationPercent?: number;
  annualDegradationPercent?: number;
  annualMaintenancePercent?: number;
  annualDiscountRatePercent?: number;
  inverterReplacementYear?: number | null;
  inverterReplacementCost?: number;
  projectionYears?: number;
};

export type PaybackChartPoint = {
  year: number;
  cumulativeBalance: number;
  discountedCumulativeBalance: number;
  annualNetCashFlow: number;
};

export type PaybackResult = {
  calculationVersion: typeof PAYBACK_CALCULATION_VERSION;
  kitCost: number;
  additionalCostsTotal: number;
  directCost: number;
  marginPercentage: number;
  profitAmount: number;
  totalInvestment: number;
  tariffTaxMode: TariffTaxMode;
  totalTariffsPercent: number;
  effectiveTariffPerKwh: number;
  estimatedEnergyBillAmount: number;
  averageMonthlyBillAmount: number | null;
  estimatedResidualBillAmount: number | null;
  estimatedBillReductionPercent: number | null;
  billReferenceDifferencePercent: number | null;
  billReferenceStatus: BillReferenceStatus;
  regulatoryFramework: RegulatoryFramework;
  regulatoryChargePercentFirstYear: number;
  fioBComponentsPerKwh: number;
  selfConsumptionPercent: number;
  directSelfConsumptionKwhPerMonth: number;
  gridCompensatedEnergyKwhPerMonth: number;
  compensatedEnergyKwhPerMonth: number;
  grossMonthlySavings: number;
  regulatoryMonthlyCharge: number;
  monthlySavings: number;
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
  projectionYears: number;
  status: PaybackStatus;
  statusLabel: string;
  warnings: string[];
  chartData: PaybackChartPoint[];
};

export const PAYBACK_STATUS_LABELS: Record<PaybackStatus, string> = {
  excellent: 'Excelente',
  very_good: 'Muito bom',
  good: 'Bom',
  regular: 'Retorno prolongado',
  unfeasible: 'Requer revisão',
};

export const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const finiteOr = (value: number | null | undefined, fallback: number) => (
  value != null && Number.isFinite(value) ? value : fallback
);

export const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} deve ser igual ou maior que zero.`);
};

export const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} deve ser maior que zero.`);
};

export const assertPercent = (value: number, field: string, max = 100) => {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${field} deve estar entre 0% e ${max}%.`);
  }
};

export function classifyPayback(years: number): PaybackStatus {
  if (!Number.isFinite(years)) return 'unfeasible';
  if (years <= 3) return 'excellent';
  if (years <= 5) return 'very_good';
  if (years <= 7) return 'good';
  return 'regular';
}

export function getRegulatoryChargePercent(
  framework: RegulatoryFramework,
  year: number,
  customPercent = 0,
  postTransitionPercent = 100,
) {
  if (framework === 'gd1') return 0;
  if (framework === 'custom') return customPercent;
  if (year <= 2022) return 0;
  if (year === 2023) return 15;
  if (year === 2024) return 30;
  if (year === 2025) return 45;
  if (year === 2026) return 60;
  if (year === 2027) return 75;
  if (year === 2028) return 90;
  return postTransitionPercent;
}
