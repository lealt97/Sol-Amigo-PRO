export type CommercialProfitabilityStatus =
  | 'unavailable'
  | 'loss'
  | 'break_even'
  | 'below_target'
  | 'target_met';

export type CommercialProfitabilitySeverity = 'neutral' | 'danger' | 'warning' | 'success';

export type CommercialProfitabilityInput = {
  proposalPrice: number;
  directCost?: number | null;
  targetMarginPercentage: number;
};

export type CommercialProfitabilityResult = {
  status: CommercialProfitabilityStatus;
  severity: CommercialProfitabilitySeverity;
  hasCostBasis: boolean;
  proposalPrice: number;
  directCost: number | null;
  profitAmount: number | null;
  effectiveMarginPercentage: number | null;
  targetMarginPercentage: number;
  breakEvenPrice: number | null;
  targetPrice: number | null;
  priceGapToBreakEven: number | null;
  priceGapToTarget: number | null;
};

const MONEY_EPSILON = 0.005;
const MARGIN_EPSILON = 0.005;

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} deve ser maior que zero.`);
  }
};

const assertTargetMargin = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value >= 100) {
    throw new Error('A margem mínima esperada deve estar entre 0% e 99,99%.');
  }
};

export function evaluateCommercialProfitability(
  input: CommercialProfitabilityInput,
): CommercialProfitabilityResult {
  assertPositive(input.proposalPrice, 'Preço da proposta');
  assertTargetMargin(input.targetMarginPercentage);

  const targetMarginPercentage = round(input.targetMarginPercentage, 2);
  const directCost = input.directCost ?? null;

  if (directCost == null) {
    return {
      status: 'unavailable',
      severity: 'neutral',
      hasCostBasis: false,
      proposalPrice: round(input.proposalPrice),
      directCost: null,
      profitAmount: null,
      effectiveMarginPercentage: null,
      targetMarginPercentage,
      breakEvenPrice: null,
      targetPrice: null,
      priceGapToBreakEven: null,
      priceGapToTarget: null,
    };
  }

  assertPositive(directCost, 'Custo direto');

  const profitAmount = input.proposalPrice - directCost;
  const effectiveMarginPercentage = (profitAmount / input.proposalPrice) * 100;
  const targetPrice = directCost / (1 - input.targetMarginPercentage / 100);
  const priceGapToBreakEven = Math.max(0, directCost - input.proposalPrice);
  const priceGapToTarget = Math.max(0, targetPrice - input.proposalPrice);

  let status: CommercialProfitabilityStatus;
  let severity: CommercialProfitabilitySeverity;

  if (profitAmount < -MONEY_EPSILON) {
    status = 'loss';
    severity = 'danger';
  } else if (Math.abs(profitAmount) <= MONEY_EPSILON) {
    status = 'break_even';
    severity = 'warning';
  } else if (effectiveMarginPercentage + MARGIN_EPSILON < input.targetMarginPercentage) {
    status = 'below_target';
    severity = 'warning';
  } else {
    status = 'target_met';
    severity = 'success';
  }

  return {
    status,
    severity,
    hasCostBasis: true,
    proposalPrice: round(input.proposalPrice),
    directCost: round(directCost),
    profitAmount: round(profitAmount),
    effectiveMarginPercentage: round(effectiveMarginPercentage),
    targetMarginPercentage,
    breakEvenPrice: round(directCost),
    targetPrice: round(targetPrice),
    priceGapToBreakEven: round(priceGapToBreakEven),
    priceGapToTarget: round(priceGapToTarget),
  };
}
