import { supabase } from '../lib/supabase/client';
import type { Proposal } from '../types/proposal';
import { proposalService } from './proposalService';

async function markWhatsAppSent(proposalId: string): Promise<Proposal> {
  const proposal = await proposalService.getProposalById(proposalId);
  const nextStatus = proposal.status === 'pending' ? 'sent' : proposal.status;

  const { error } = await supabase
    .from('proposals')
    .update({
      status: nextStatus,
      sent_whatsapp_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  if (error) throw error;
  return proposalService.getProposalById(proposalId);
}

export const proposalDeliveryService = {
  markWhatsAppSent,
};
