import { supabase } from '../lib/supabase/client';
import {
  createPublicProposalOperations,
  type PublicProposalPayload,
  type PublicProposalStatusUpdate,
} from '../lib/public-proposals/publicProposalOperations';

async function fetchProposalByToken(token: string): Promise<PublicProposalPayload | null> {
  const { data, error } = await supabase
    .rpc('get_public_proposal', { p_token: token });

  if (error) {
    console.error('Error fetching public proposal via secure RPC:', error);
    throw error;
  }

  return data ? data as PublicProposalPayload : null;
}

async function createSignedPdfUrl(token: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('public-proposal-pdf', {
    body: { token },
  });

  if (error) throw error;
  return typeof data?.signedUrl === 'string' ? data.signedUrl : null;
}

async function updatePublicProposalStatus(input: PublicProposalStatusUpdate) {
  const { data, error } = await supabase
    .rpc('update_public_proposal_status', {
      p_token: input.token,
      p_status: input.status,
      p_reason: input.reason,
      p_ip: null,
      p_user_agent: input.userAgent,
    });

  if (error) {
    console.error('Error updating public proposal via secure RPC:', error);
    throw error;
  }

  return data;
}

const publicProposalOperations = createPublicProposalOperations(
  {
    fetchByToken: fetchProposalByToken,
    createSignedPdfUrl,
    updateStatus: updatePublicProposalStatus,
  },
  console,
);

export const publicProposalService = {
  getProposalByToken(token: string) {
    return publicProposalOperations.getProposalByToken(token);
  },

  updateStatus(
    token: string,
    status: 'approved' | 'rejected',
    reason?: string,
    _proposalId?: string,
  ) {
    const userAgent = typeof navigator === 'undefined' ? null : navigator.userAgent;
    return publicProposalOperations.updateStatus(token, status, reason, userAgent);
  },
};
