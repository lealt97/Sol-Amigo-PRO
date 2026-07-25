import { supabase } from '../lib/supabase/client';
import { isActiveProposalFlowDraft } from '../lib/proposals/flow';
import { Proposal } from '../types/proposal';
import { isProposalDraftState, type ProposalDraftState } from '../types/proposalDraft';

const profileSelect = 'company_name, logo_url, seller_name, seller_phone, seller_email, seller_signature_url, website, company_email, default_validity_days, default_margin_percentage';
const clientSelect = 'name, document, email, phone, city, state';

const buildSecurePdfUrl = (publicToken?: string | null) => {
  if (!publicToken) return null;
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1/public-proposal-pdf?token=${encodeURIComponent(publicToken)}`;
};

export type ProposalFlowSummary = Partial<Pick<Proposal,
  | 'title'
  | 'consumption_source'
  | 'history'
  | 'monthly_consumption_kwh'
  | 'estimated_daily_consumption'
  | 'energy_tariff'
  | 'bill_amount'
  | 'roof_area_m2'
  | 'roof_image_url'
  | 'module_width_m'
  | 'module_height_m'
  | 'selected_solar_kit_id'
  | 'solar_kit_snapshot'
  | 'kit_cost'
  | 'other_costs'
  | 'margin_percentage'
  | 'total_cost'
  | 'gross_price'
  | 'final_price'
  | 'estimated_profit'
>>;

type CreateFlowDraftInput = {
  userId: string;
  clientId: string;
  clientName: string;
  flowStep: number;
  flowState: ProposalDraftState;
  summary?: ProposalFlowSummary;
};

type SaveFlowDraftInput = {
  proposalId: string;
  flowStep: number;
  flowState: ProposalDraftState;
  summary?: ProposalFlowSummary;
};

function normalizeProposalTitle(title: string) {
  const normalized = title.trim().replace(/\s+/g, ' ');
  if (normalized.length < 3) throw new Error('Informe um nome com pelo menos 3 caracteres.');
  if (normalized.length > 120) throw new Error('O nome da proposta deve ter no máximo 120 caracteres.');
  return normalized;
}

async function getProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`*, client:clients(${clientSelect}), solar:solar_system_calculations(installed_power_kwp), profile:profiles(${profileSelect})`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Proposal[];
}

async function getProposalById(id: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`*, client:clients(${clientSelect}), solar:solar_system_calculations(*), loads:proposal_loads(*), profile:profiles(${profileSelect})`)
    .eq('id', id)
    .single();

  if (error) throw error;

  if (data && Array.isArray(data.solar) && data.solar.length > 0) {
    data.solar = data.solar[0];
  } else if (Array.isArray(data?.solar)) {
    data.solar = null;
  }

  const securePdfUrl = buildSecurePdfUrl(data?.public_token);
  if (data && 'pdf_storage_path' in data && data.pdf_storage_path && securePdfUrl) {
    data.pdf_url = securePdfUrl;
  }

  return data as Proposal;
}

async function getFlowDraftById(id: string): Promise<Proposal> {
  const proposal = await getProposalById(id);
  if (!isActiveProposalFlowDraft(proposal)) {
    throw new Error('Este rascunho não está mais disponível para continuar.');
  }
  return proposal;
}

async function getEditableProposalById(id: string): Promise<Proposal> {
  const proposal = await getProposalById(id);
  if (isActiveProposalFlowDraft(proposal) || proposal.flow_completed !== true) {
    throw new Error('Esta proposta ainda está em rascunho. Use o botão Continuar.');
  }
  if (!isProposalDraftState(proposal.flow_state)) {
    throw new Error('Esta proposta não possui dados compatíveis com o Wizard de edição.');
  }
  return proposal;
}

async function findActiveFlowDraftByClient(userId: string, clientId: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('status', 'draft')
    .eq('flow_completed', false)
    .not('flow_state', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Proposal | null;
}

function createProposalCode(prefix: 'RASC' | 'COPIA') {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = globalThis.crypto.randomUUID().slice(0, 6).toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}

async function createOrResumeFlowDraft(input: CreateFlowDraftInput) {
  const existing = await findActiveFlowDraftByClient(input.userId, input.clientId);
  if (existing) return { proposal: existing, resumed: true } as const;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      user_id: input.userId,
      client_id: input.clientId,
      code: createProposalCode('RASC'),
      title: `Proposta em elaboração — ${input.clientName}`,
      status: 'draft',
      system_type: 'on_grid',
      flow_step: input.flowStep,
      flow_state: input.flowState,
      flow_version: input.flowState.version,
      flow_completed: false,
      flow_last_saved_at: now,
      ...input.summary,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const concurrentDraft = await findActiveFlowDraftByClient(input.userId, input.clientId);
      if (concurrentDraft) return { proposal: concurrentDraft, resumed: true } as const;
    }
    throw error;
  }
  return { proposal: data as Proposal, resumed: false } as const;
}

async function saveFlowDraft(input: SaveFlowDraftInput): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      status: 'draft',
      flow_step: input.flowStep,
      flow_state: input.flowState,
      flow_version: input.flowState.version,
      flow_completed: false,
      flow_last_saved_at: new Date().toISOString(),
      ...input.summary,
    })
    .eq('id', input.proposalId)
    .eq('status', 'draft')
    .eq('flow_completed', false)
    .select('*')
    .single();

  if (error) throw error;
  return data as Proposal;
}

async function saveCompletedProposal(input: SaveFlowDraftInput): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      flow_step: input.flowStep,
      flow_state: input.flowState,
      flow_version: input.flowState.version,
      flow_completed: true,
      flow_last_saved_at: new Date().toISOString(),
      ...input.summary,
    })
    .eq('id', input.proposalId)
    .eq('flow_completed', true)
    .select('*')
    .single();

  if (error) throw error;
  return data as Proposal;
}

async function completeFlowDraft(input: SaveFlowDraftInput): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      status: 'pending',
      flow_step: input.flowStep,
      flow_state: input.flowState,
      flow_version: input.flowState.version,
      flow_completed: true,
      flow_last_saved_at: new Date().toISOString(),
      ...input.summary,
    })
    .eq('id', input.proposalId)
    .eq('status', 'draft')
    .eq('flow_completed', false)
    .select('*')
    .single();

  if (error) throw error;
  return data as Proposal;
}

async function renameProposal(id: string, title: string): Promise<Proposal> {
  const proposal = await getProposalById(id);
  if (isActiveProposalFlowDraft(proposal)) {
    throw new Error('Rascunhos em andamento devem ser nomeados dentro do Wizard.');
  }

  const normalizedTitle = normalizeProposalTitle(title);
  const flowState = isProposalDraftState(proposal.flow_state)
    ? { ...proposal.flow_state, proposalTitle: normalizedTitle }
    : proposal.flow_state;

  const { data, error } = await supabase
    .from('proposals')
    .update({ title: normalizedTitle, flow_state: flowState })
    .eq('id', id)
    .eq('flow_completed', true)
    .select('*')
    .single();

  if (error) throw error;
  return data as Proposal;
}

async function duplicateProposal(id: string): Promise<Proposal> {
  const source = await getProposalById(id);
  if (isActiveProposalFlowDraft(source) || source.flow_completed !== true) {
    throw new Error('A proposta precisa estar finalizada antes de ser duplicada.');
  }

  const duplicateTitle = normalizeProposalTitle(`Cópia de ${source.title || 'Proposta'}`.slice(0, 120));
  const duplicatePayload: Record<string, unknown> = { ...source };
  [
    'id', 'client', 'solar', 'loads', 'profile', 'created_at', 'updated_at',
    'pdf_url', 'pdf_storage_path', 'public_token', 'public_token_expires_at',
    'public_token_revoked_at', 'sent_whatsapp_at', 'accepted_at', 'rejected_at',
    'public_viewed_at', 'rejection_reason', 'client_ip', 'client_user_agent',
  ].forEach((key) => delete duplicatePayload[key]);

  duplicatePayload.code = createProposalCode('COPIA');
  duplicatePayload.title = duplicateTitle;
  duplicatePayload.status = 'pending';
  duplicatePayload.revision = 0;
  duplicatePayload.flow_completed = true;
  duplicatePayload.flow_last_saved_at = new Date().toISOString();
  duplicatePayload.pdf_url = null;
  duplicatePayload.pdf_storage_path = null;
  duplicatePayload.public_token = null;
  duplicatePayload.sent_whatsapp_at = null;
  duplicatePayload.accepted_at = null;
  duplicatePayload.rejected_at = null;
  duplicatePayload.public_viewed_at = null;
  duplicatePayload.rejection_reason = null;
  duplicatePayload.flow_state = isProposalDraftState(source.flow_state)
    ? { ...source.flow_state, proposalTitle: duplicateTitle }
    : source.flow_state;

  const { data, error } = await supabase
    .from('proposals')
    .insert(duplicatePayload)
    .select('*')
    .single();

  if (error) throw error;
  return data as Proposal;
}

async function deleteProposal(id: string) {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export const proposalService = {
  getProposals,
  getProposalById,
  getFlowDraftById,
  getEditableProposalById,
  findActiveFlowDraftByClient,
  createOrResumeFlowDraft,
  saveFlowDraft,
  saveCompletedProposal,
  completeFlowDraft,
  renameProposal,
  duplicateProposal,
  deleteProposal,
};
