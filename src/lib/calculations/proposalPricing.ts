export type ProposalPricingMode = 'margin' | 'manual';

export type ProposalPricingInput = {
  pricingMode: ProposalPricingMode;
  proposalPrice?: number | null;
  baseSystemCost?: number | null;
  additionalCostsTotal: number;
  requestedMarginPercentage?: number | null;
};

export type ProposalPricingResult = {
  proposalPrice: number;
  hasCostBasis: boolean;
  directCost: number | null;
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} deve ser maior que zero.`);
  }
};

const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} deve ser igual ou maior que zero.`);
  }
};

export function resolveProposalPricing(input: ProposalPricingInput): ProposalPricingResult {
  assertNonNegative(input.additionalCostsTotal, 'Custos adicionais');

  const baseSystemCost = input.baseSystemCost ?? null;
  if (baseSystemCost != null) {
    assertPositive(baseSystemCost, 'Base interna de custos');
  }

  const hasCostBasis = baseSystemCost != null;
  const directCost = hasCostBasis
    ? baseSystemCost + input.additionalCostsTotal
    : null;

  if (input.pricingMode === 'margin') {
    if (directCost == null) {
      throw new Error('Informe a base interna de custos para calcular o preço pela margem.');
    }

    const requestedMarginPercentage = input.requestedMarginPercentage ?? Number.NaN;
    if (
      !Number.isFinite(requestedMarginPercentage)
      || requestedMarginPercentage < 0
      || requestedMarginPercentage >= 100
    ) {
      throw new Error('A margem de lucro deve estar entre 0% e 99,99%.');
    }

    return {
      proposalPrice: directCost / (1 - requestedMarginPercentage / 100),
      hasCostBasis,
      directCost,
    };
  }

  const proposalPrice = input.proposalPrice ?? Number.NaN;
  assertPositive(proposalPrice, 'Preço da proposta');

  return {
    proposalPrice,
    hasCostBasis,
    directCost,
  };
}
