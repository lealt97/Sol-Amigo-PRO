export const PENDING_PROPOSAL_STATUSES = ['draft', 'pending'] as const;

type ProposalSolarStatusSource = {
  installed_power_kwp?: unknown;
};

type ProposalStatusData = {
  status?: string | null;
  final_price?: unknown;
  monthly_consumption_kwh?: unknown;
  energy_tariff?: unknown;
  kit_cost?: unknown;
  solar?: ProposalSolarStatusSource | ProposalSolarStatusSource[] | null;
};

type ProposalStatusSource = string | null | undefined | ProposalStatusData;

function isPositiveNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function getSolarCalculation(source: ProposalStatusData) {
  if (Array.isArray(source.solar)) return source.solar[0] || null;
  return source.solar || null;
}

export function hasProposalCompletionData(source: ProposalStatusData) {
  const solar = getSolarCalculation(source);

  return isPositiveNumber(source.final_price)
    && isPositiveNumber(source.monthly_consumption_kwh)
    && isPositiveNumber(source.energy_tariff)
    && isPositiveNumber(source.kit_cost)
    && isPositiveNumber(solar?.installed_power_kwp);
}

export function isProposalPending(source: ProposalStatusSource) {
  const status = typeof source === 'string' ? source : source?.status;

  if (status === 'draft') return true;
  if (status !== 'pending') return false;

  // Chamadas que possuem apenas o texto do status continuam tratando
  // `pending` como parte do agrupamento visual de propostas pendentes.
  if (!source || typeof source === 'string') return true;

  // O banco historicamente também usa `pending` depois que o Wizard é
  // concluído. Os dados calculados distinguem a proposta pronta para a tela
  // de detalhes de um auto-save ainda incompleto.
  return !hasProposalCompletionData(source);
}
