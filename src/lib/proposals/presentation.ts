import type { Proposal } from '../../types/proposal';

export type ProposalStatusPresentation = {
  label: string;
  description: string;
  className: string;
};

const PROPOSAL_STATUS_PRESENTATION: Record<Proposal['status'], ProposalStatusPresentation> = {
  draft: {
    label: 'Rascunho',
    description: 'Ainda está sendo preenchida pelo integrador.',
    className: 'border-slate-300/40 bg-slate-400/10 text-slate-300',
  },
  pending: {
    label: 'Pronta para envio',
    description: 'Foi concluída e ainda não foi compartilhada com o cliente.',
    className: 'border-amber-300/40 bg-amber-400/10 text-amber-300',
  },
  sent: {
    label: 'Enviada',
    description: 'Foi compartilhada e ainda não foi aberta pelo cliente.',
    className: 'border-sky-300/40 bg-sky-400/10 text-sky-300',
  },
  viewed: {
    label: 'Visualizada',
    description: 'O cliente abriu a proposta.',
    className: 'border-violet-300/40 bg-violet-400/10 text-violet-300',
  },
  accepted: {
    label: 'Aprovada',
    description: 'O cliente aprovou a proposta.',
    className: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-300',
  },
  approved: {
    label: 'Aprovada',
    description: 'O cliente aprovou a proposta.',
    className: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-300',
  },
  rejected: {
    label: 'Recusada',
    description: 'O cliente recusou a proposta.',
    className: 'border-red-300/40 bg-red-400/10 text-red-300',
  },
  expired: {
    label: 'Expirada',
    description: 'O prazo de validade terminou.',
    className: 'border-slate-300/40 bg-slate-400/10 text-slate-300',
  },
};

export function getProposalStatusPresentation(status: Proposal['status'] | string) {
  return PROPOSAL_STATUS_PRESENTATION[status as Proposal['status']] || {
    label: status || 'Status desconhecido',
    description: 'O status desta proposta não foi reconhecido.',
    className: 'border-brand-border bg-gray-50 text-slate-500',
  };
}

export function getProposalStatusLabel(status: Proposal['status'] | string) {
  return getProposalStatusPresentation(status).label;
}
