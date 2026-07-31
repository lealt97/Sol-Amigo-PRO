from pathlib import Path

ROOT = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:140]!r}')
    file.write_text(text.replace(old, new, 1))


PAYBACK_ENGINE = r'''export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'unfeasible';
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
'''

(ROOT / 'src/lib/calculations/payback.ts').write_text(PAYBACK_ENGINE)

replace_once(
    'src/types/proposalDraft.ts',
    """  proposalPrice?: string;
  estimatedSystemCost?: string;
  pisPercent: string;""",
    """  proposalPrice?: string;
  estimatedSystemCost?: string;
  analysisYears?: string;
  annualTariffEscalationPercent?: string;
  annualGenerationDegradationPercent?: string;
  annualOperationMaintenancePercent?: string;
  discountRatePercent?: string;
  compensationFactorPercent?: string;
  inverterReplacementYear?: string;
  inverterReplacementCost?: string;
  pisPercent: string;""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """  proposalPrice: '',
  estimatedSystemCost: '',
  pisPercent: '0',""",
    """  proposalPrice: '',
  estimatedSystemCost: '',
  analysisYears: '25',
  annualTariffEscalationPercent: '4.5',
  annualGenerationDegradationPercent: '0.5',
  annualOperationMaintenancePercent: '0.5',
  discountRatePercent: '8',
  compensationFactorPercent: '100',
  inverterReplacementYear: '12',
  inverterReplacementCost: '',
  pisPercent: '0',""",
)

payback_path = ROOT / 'src/pages/propostas/PaybackStep.tsx'
payback = payback_path.read_text()
normalize_start = payback.index('const normalizeForm = ')
normalize_end = payback.index('\nconst parseNumber', normalize_start)
normalize_block = r'''const normalizeForm = (form: ProposalDraftPaybackForm): PaybackFormState => {
  const normalized = {
    ...form,
    proposalPrice: typeof form.proposalPrice === 'string'
      ? form.proposalPrice
      : typeof form.estimatedSystemCost === 'string'
        ? form.estimatedSystemCost
        : '',
    averageMonthlyBillAmount: typeof form.averageMonthlyBillAmount === 'string' ? form.averageMonthlyBillAmount : '',
    estimatedSystemCost: typeof form.estimatedSystemCost === 'string' ? form.estimatedSystemCost : '',
    analysisYears: typeof form.analysisYears === 'string' ? form.analysisYears : '25',
    annualTariffEscalationPercent: typeof form.annualTariffEscalationPercent === 'string' ? form.annualTariffEscalationPercent : '4.5',
    annualGenerationDegradationPercent: typeof form.annualGenerationDegradationPercent === 'string' ? form.annualGenerationDegradationPercent : '0.5',
    annualOperationMaintenancePercent: typeof form.annualOperationMaintenancePercent === 'string' ? form.annualOperationMaintenancePercent : '0.5',
    discountRatePercent: typeof form.discountRatePercent === 'string' ? form.discountRatePercent : '8',
    compensationFactorPercent: typeof form.compensationFactorPercent === 'string' ? form.compensationFactorPercent : '100',
    inverterReplacementYear: typeof form.inverterReplacementYear === 'string' ? form.inverterReplacementYear : '12',
    inverterReplacementCost: typeof form.inverterReplacementCost === 'string' ? form.inverterReplacementCost : '',
    marginPercentage: typeof form.marginPercentage === 'string' ? form.marginPercentage : '',
  };

  const unchanged = Object.entries(normalized).every(([key, value]) => (
    form[key as keyof ProposalDraftPaybackForm] === value
  ));
  return unchanged ? form : normalized;
};
'''
payback = payback[:normalize_start] + normalize_block + payback[normalize_end:]
payback_path.write_text(payback)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """          monthlyGenerationKwh,
          additionalCosts: form.additionalCosts.map((cost) => ({
            description: cost.description.trim() || 'Custo adicional',
            amount: parseNumber(cost.amount || '0'),
          })),
        }),""",
    """          monthlyGenerationKwh,
          additionalCosts: form.additionalCosts.map((cost) => ({
            description: cost.description.trim() || 'Custo adicional',
            amount: parseNumber(cost.amount || '0'),
          })),
          analysisYears: parseNumber(form.analysisYears || '25'),
          annualTariffEscalationPercent: parseNumber(form.annualTariffEscalationPercent || '4.5'),
          annualGenerationDegradationPercent: parseNumber(form.annualGenerationDegradationPercent || '0.5'),
          annualOperationMaintenancePercent: parseNumber(form.annualOperationMaintenancePercent || '0.5'),
          discountRatePercent: parseNumber(form.discountRatePercent || '8'),
          compensationFactorPercent: parseNumber(form.compensationFactorPercent || '100'),
          inverterReplacementYear: form.inverterReplacementYear?.trim()
            ? parseNumber(form.inverterReplacementYear)
            : null,
          inverterReplacementCost: form.inverterReplacementCost?.trim()
            ? parseNumber(form.inverterReplacementCost)
            : 0,
        }),""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """  const paybackMarkerYear = result
    && Number.isFinite(result.paybackYears)
    && result.paybackYears <= chartProjectionLastYear
      ? Math.ceil(result.paybackYears)
      : null;""",
    """  const paybackMarkerYear = result
    && Number.isFinite(result.simplePaybackYears)
    && result.simplePaybackYears <= chartProjectionLastYear
      ? Math.ceil(result.simplePaybackYears)
      : null;
  const discountedPaybackMarkerYear = result
    && Number.isFinite(result.discountedPaybackYears)
    && result.discountedPaybackYears <= chartProjectionLastYear
      ? Math.ceil(result.discountedPaybackYears)
      : null;""",
)

advanced_section = r'''
      <details className="rounded-xl border border-brand-border bg-brand-gray/20 p-5">
        <summary className="cursor-pointer font-bold text-brand-dark">Premissas financeiras avançadas</summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Ajuste as hipóteses usadas no fluxo de caixa. Os valores iniciais são referências editáveis da pré-proposta e devem ser adequados à distribuidora, ao contrato e ao perfil do cliente.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PaybackField label="Horizonte de análise" value={form.analysisYears || '25'} onChange={(value) => updateField('analysisYears', value)} suffix="anos" min={1} max={40} />
          <PaybackField label="Reajuste anual da tarifa" value={form.annualTariffEscalationPercent || '4.5'} onChange={(value) => updateField('annualTariffEscalationPercent', value)} suffix="% a.a." min={-20} max={100} helper="Projeção de aumento da tarifa; não é garantia de reajuste futuro." />
          <PaybackField label="Degradação anual da geração" value={form.annualGenerationDegradationPercent || '0.5'} onChange={(value) => updateField('annualGenerationDegradationPercent', value)} suffix="% a.a." min={0} max={10} />
          <PaybackField label="Operação e manutenção anual" value={form.annualOperationMaintenancePercent || '0.5'} onChange={(value) => updateField('annualOperationMaintenancePercent', value)} suffix="% do preço" min={0} max={20} />
          <PaybackField label="Taxa de desconto / TMA" value={form.discountRatePercent || '8'} onChange={(value) => updateField('discountRatePercent', value)} suffix="% a.a." min={0} max={100} helper="Usada no VPL e no payback descontado." />
          <PaybackField label="Fator efetivo de compensação" value={form.compensationFactorPercent || '100'} onChange={(value) => updateField('compensationFactorPercent', value)} suffix="%" min={0} max={100} helper="Reduza quando nem toda a energia compensada tiver o mesmo valor econômico da tarifa." />
          <PaybackField label="Ano de troca do inversor" value={form.inverterReplacementYear || ''} onChange={(value) => updateField('inverterReplacementYear', value)} suffix="ano" min={1} max={40} helper="Opcional. Deixe vazio quando não quiser provisionar a substituição." />
          <PaybackField label="Custo estimado da troca" value={form.inverterReplacementCost || ''} onChange={(value) => updateField('inverterReplacementCost', value)} prefix="R$" min={0} />
        </div>
      </details>
'''
replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    '      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">\n        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">',
    advanced_section + '\n      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">\n        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">',
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Preço da proposta" value={currency.format(result.totalInvestment)} highlight />
            <PaybackSummary label="Economia mensal" value={currency.format(result.monthlySavings)} />
            <PaybackSummary label="Economia anual" value={currency.format(result.annualSavings)} />
            <PaybackSummary label="Payback" value={`${decimal.format(result.paybackYears)} anos`} />
          </div>""",
    """          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Payback simples" value={Number.isFinite(result.simplePaybackYears) ? `${decimal.format(result.simplePaybackYears)} anos` : 'Não recuperado'} />
            <PaybackSummary label="Payback descontado" value={Number.isFinite(result.discountedPaybackYears) ? `${decimal.format(result.discountedPaybackYears)} anos` : `Acima de ${result.analysisYears} anos`} highlight />
            <PaybackSummary label={`VPL em ${result.analysisYears} anos`} value={currency.format(result.netPresentValue)} />
            <PaybackSummary label="TIR estimada" value={result.internalRateOfReturnPercent == null ? 'Não calculável' : `${decimal.format(result.internalRateOfReturnPercent)}% a.a.`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Preço da proposta" value={currency.format(result.totalInvestment)} />
            <PaybackSummary label="Economia no 1º ano" value={currency.format(result.annualSavings)} />
            <PaybackSummary label={`Economia bruta em ${result.analysisYears} anos`} value={currency.format(result.lifetimeGrossSavings)} />
            <PaybackSummary label={`Benefício líquido em ${result.analysisYears} anos`} value={currency.format(result.lifetimeNetSavings - result.totalInvestment)} />
          </div>""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """              <p className="text-xs font-bold uppercase tracking-wider opacity-75">Status do payback</p>
              <h3 className="mt-1 text-xl font-bold">{result.statusLabel}</h3>
              <p className="mt-2 text-sm leading-6">
                Retorno estimado em <strong>{decimal.format(result.paybackYears)} anos</strong> ({result.paybackMonths} meses), com tarifa efetiva de <strong>{currency.format(result.effectiveTariffPerKwh)}/kWh</strong>.
              </p>""",
    """              <p className="text-xs font-bold uppercase tracking-wider opacity-75">Viabilidade financeira projetada</p>
              <h3 className="mt-1 text-xl font-bold">{result.statusLabel}</h3>
              <p className="mt-2 text-sm leading-6">
                Payback simples de <strong>{Number.isFinite(result.simplePaybackYears) ? `${decimal.format(result.simplePaybackYears)} anos` : 'não recuperado'}</strong> e payback descontado de <strong>{Number.isFinite(result.discountedPaybackYears) ? `${decimal.format(result.discountedPaybackYears)} anos` : `mais de ${result.analysisYears} anos`}</strong>. VPL projetado: <strong>{currency.format(result.netPresentValue)}</strong>.
              </p>""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    '<h3 className="font-bold text-brand-dark">Saldo acumulado em 25 anos</h3>\n                  <p className="mt-1 text-xs text-slate-500">Barras negativas representam capital ainda não recuperado; positivas representam retorno acumulado.</p>',
    '<h3 className="font-bold text-brand-dark">Fluxo de caixa acumulado em {result.analysisYears} anos</h3>\n                  <p className="mt-1 text-xs text-slate-500">Compare o saldo nominal com o saldo descontado pela TMA informada.</p>',
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    "formatter={(value) => [currency.format(Number(value)), 'Saldo acumulado']}",
    "formatter={(value, name) => [currency.format(Number(value)), name === 'discountedCumulativeBalance' ? 'Saldo descontado' : 'Saldo nominal']}",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """                    <Bar
                      dataKey="cumulativeBalance"
                      radius={0}
                      activeBar={{
                        fill: 'var(--color-chart-marker, var(--color-brand-light))',
                        stroke: 'var(--color-chart-tooltip-text, var(--color-brand-dark))',
                        strokeWidth: 1,
                      }}
                    >
                      {result.chartData.map((point) => (
                        <Cell
                          key={point.year}
                          fill={point.cumulativeBalance >= 0
                            ? 'var(--color-chart-positive, var(--color-brand-blue))'
                            : 'var(--color-chart-negative, var(--color-brand-yellow))'}
                        />
                      ))}
                    </Bar>""",
    """                    <Bar
                      dataKey="cumulativeBalance"
                      radius={0}
                      activeBar={{
                        fill: 'var(--color-chart-marker, var(--color-brand-light))',
                        stroke: 'var(--color-chart-tooltip-text, var(--color-brand-dark))',
                        strokeWidth: 1,
                      }}
                    >
                      {result.chartData.map((point) => (
                        <Cell
                          key={point.year}
                          fill={point.cumulativeBalance >= 0
                            ? 'var(--color-chart-positive, var(--color-brand-blue))'
                            : 'var(--color-chart-negative, var(--color-brand-yellow))'}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="discountedCumulativeBalance"
                      radius={0}
                      fill="var(--color-chart-marker, var(--color-brand-light))"
                      opacity={0.72}
                    />""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """                    {paybackMarkerYear != null && (
                      <ReferenceLine
                        x={paybackMarkerYear}
                        stroke="var(--color-chart-marker, var(--color-brand-light))"
                        strokeDasharray="5 4"
                        strokeWidth={2}
                        label={{
                          value: 'Payback',
                          position: 'insideTopRight',
                          fill: 'var(--color-chart-marker, var(--color-brand-light))',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      />
                    )}""",
    """                    {paybackMarkerYear != null && (
                      <ReferenceLine
                        x={paybackMarkerYear}
                        stroke="var(--color-chart-positive, var(--color-brand-blue))"
                        strokeDasharray="5 4"
                        strokeWidth={2}
                        label={{
                          value: 'Simples',
                          position: 'insideTopRight',
                          fill: 'var(--color-chart-positive, var(--color-brand-blue))',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      />
                    )}
                    {discountedPaybackMarkerYear != null && (
                      <ReferenceLine
                        x={discountedPaybackMarkerYear}
                        stroke="var(--color-chart-marker, var(--color-brand-light))"
                        strokeDasharray="2 4"
                        strokeWidth={2}
                        label={{
                          value: 'Descontado',
                          position: 'insideBottomRight',
                          fill: 'var(--color-chart-marker, var(--color-brand-light))',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      />
                    )}""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """                {paybackMarkerYear != null && (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-5 border-t-2 border-dashed"
                      style={{ borderColor: 'var(--color-chart-marker, var(--color-brand-light))' }}
                    />
                    Marco do payback
                  </span>
                )}""",
    """                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'var(--color-chart-marker, var(--color-brand-light))', opacity: 0.72 }} />
                  Saldo descontado
                </span>
                {paybackMarkerYear != null && (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 border-t-2 border-dashed" style={{ borderColor: 'var(--color-chart-positive, var(--color-brand-blue))' }} />
                    Payback simples
                  </span>
                )}
                {discountedPaybackMarkerYear != null && (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 border-t-2 border-dashed" style={{ borderColor: 'var(--color-chart-marker, var(--color-brand-light))' }} />
                    Payback descontado
                  </span>
                )}""",
)

PAYBACK_TEST = r'''import assert from 'node:assert/strict';
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
'''
(ROOT / 'tests/payback.test.ts').write_text(PAYBACK_TEST)

ADVANCED_FLOW_TEST = r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('a etapa de payback expõe premissas avançadas e indicadores financeiros', async () => {
  const [step, engine, draft] = await Promise.all([
    readFile('src/pages/propostas/PaybackStep.tsx', 'utf8'),
    readFile('src/lib/calculations/payback.ts', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
  ]);

  assert.match(step, /Premissas financeiras avançadas/);
  assert.match(step, /Reajuste anual da tarifa/);
  assert.match(step, /Degradação anual da geração/);
  assert.match(step, /Operação e manutenção anual/);
  assert.match(step, /Taxa de desconto \/ TMA/);
  assert.match(step, /Fator efetivo de compensação/);
  assert.match(step, /Ano de troca do inversor/);
  assert.match(step, /Payback simples/);
  assert.match(step, /Payback descontado/);
  assert.match(step, /VPL em/);
  assert.match(step, /TIR estimada/);
  assert.match(step, /discountedCumulativeBalance/);

  assert.match(engine, /netPresentValue/);
  assert.match(engine, /internalRateOfReturnPercent/);
  assert.match(engine, /annualGenerationDegradationPercent/);
  assert.match(engine, /compensationFactorPercent/);

  assert.match(draft, /analysisYears\?: string/);
  assert.match(draft, /discountRatePercent\?: string/);
  assert.match(draft, /inverterReplacementCost\?: string/);
});
'''
(ROOT / 'tests/advanced-payback-flow.test.ts').write_text(ADVANCED_FLOW_TEST)

average_test_path = ROOT / 'tests/average-monthly-bill-flow.test.ts'
average_test = average_test_path.read_text()
old_average_assertion = r'''  assert.match(
    source,
    /typeof form\.averageMonthlyBillAmount === 'string' && typeof form\.estimatedSystemCost === 'string'\) return form/,
  );'''
if old_average_assertion in average_test:
    average_test = average_test.replace(
        old_average_assertion,
        "  assert.match(source, /const unchanged = Object\\.entries\\(normalized\\)/);\n  assert.match(source, /return unchanged \\? form : normalized/);",
        1,
    )
    average_test_path.write_text(average_test)

print('Advanced payback applied.')
