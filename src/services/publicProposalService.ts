import { supabase } from '../lib/supabase/client';

async function getSignedPdfUrl(token: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('public-proposal-pdf', {
    body: { token },
  });

  if (error) {
    console.error('Error creating signed public proposal PDF URL:', error);
    return null;
  }

  return typeof data?.signedUrl === 'string' ? data.signedUrl : null;
}

export const publicProposalService = {
  async getProposalByToken(token: string) {
    const { data, error } = await supabase
      .rpc('get_public_proposal', { p_token: token });

    if (error) {
      console.error('Error fetching public proposal via secure RPC:', error);
      throw error;
    }

    if (!data) return null;

    const pdfUrl = data.pdf_available
      ? await getSignedPdfUrl(token)
      : null;

    return {
      ...data,
      pdf_url: pdfUrl,
    };
  },

  async updateStatus(
    token: string,
    status: 'approved' | 'rejected',
    reason?: string,
    _proposalId?: string,
  ) {
    const { error } = await supabase
      .rpc('update_public_proposal_status', {
        p_token: token,
        p_status: status,
        p_reason: reason || null,
        p_ip: null,
        p_user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('Error updating public proposal via secure RPC:', error);
      throw error;
    }
  },
};
