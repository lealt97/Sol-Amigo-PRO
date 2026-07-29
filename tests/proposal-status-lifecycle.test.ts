import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getProposalStatusPresentation } from '../src/lib/proposals/presentation';

test('cada status possui um significado comercial único', () => {
  assert.equal(getProposalStatusPresentation('draft').label, 'Rascunho');
  assert.equal(getProposalStatusPresentation('pending').label, 'Pronta para envio');
  assert.equal(getProposalStatusPresentation('sent').label, 'Enviada');
  assert.equal(getProposalStatusPresentation('viewed').label, 'Visualizada');
  assert.equal(getProposalStatusPresentation('approved').label, 'Aprovada');
  assert.equal(getProposalStatusPresentation('rejected').label, 'Recusada');
  assert.equal(getProposalStatusPresentation('expired').label, 'Expirada');
});

test('o ciclo técnico corresponde às transições comerciais exibidas', async () => {
  const [service, delivery, publicFlow] = await Promise.all([
    readFile('src/services/proposalService.ts', 'utf8'),
    readFile('src/services/proposalDeliveryService.ts', 'utf8'),
    readFile('supabase/migrations/20260714143000_support_public_proposal_flow.sql', 'utf8'),
  ]);

  assert.match(service, /completeFlowDraft[\s\S]*status: 'pending'/);
  assert.match(delivery, /proposal\.status === 'pending' \? 'sent'/);
  assert.match(publicFlow, /when status in \('sent', 'pending'\) then 'viewed'/);
});
