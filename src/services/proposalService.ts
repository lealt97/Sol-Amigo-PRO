import { supabase } from '../lib/supabase/client';
import { isActiveProposalFlowDraft } from '../lib/proposals/flow';
import { Proposal } from '../types/proposal';
import type { ProposalDraftState } from '../types/proposalDraft';

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

function createDraftCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = globalThis.crypto.randomUUID().slice(0, 6).toUpperCase();
  return `RASC-${date}-${suffix}`;
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
      code: createDraftCode(),
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

  if (error) throw error;
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
  findActiveFlowDraftByClient,
  createOrResumeFlowDraft,
  saveFlowDraft,
  completeFlowDraft,
  deleteProposal,
};
