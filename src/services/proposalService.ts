import { supabase } from '../lib/supabase/client';
import { Proposal } from '../types/proposal';

const profileSelect = 'company_name, logo_url, seller_name, seller_phone, seller_email, seller_signature_url, website, company_email, default_validity_days, default_margin_percentage';
const clientSelect = 'name, document, email, phone, city, state';

const buildSecurePdfUrl = (publicToken?: string | null) => {
  if (!publicToken) return null;
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1/public-proposal-pdf?token=${encodeURIComponent(publicToken)}`;
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
  deleteProposal,
};
