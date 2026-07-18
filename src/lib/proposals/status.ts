export const PENDING_PROPOSAL_STATUSES = ['draft', 'pending'] as const;

type ProposalStatusSource = string | null | undefined | {
  status?: string | null;
};

export function isProposalPending(source: ProposalStatusSource) {
  const status = typeof source === 'string' ? source : source?.status;
  return status === 'draft' || status === 'pending';
}
