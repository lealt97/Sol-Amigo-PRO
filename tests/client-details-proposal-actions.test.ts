import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CLIENT_DETAILS = 'src/pages/clientes/ClientDetails.tsx';
const PROPOSAL_LIST = 'src/pages/propostas/ProposalList.tsx';
const ACTIONS = 'src/components/proposals/ProposalActionButtons.tsx';
const PRESENTATION = 'src/lib/proposals/presentation.ts';

test('visão geral lista todas as propostas vinculadas ao cliente com dados do fluxo', async () => {
  const [source, presentation] = await Promise.all([
    readFile(CLIENT_DETAILS, 'utf8'),
    readFile(PRESENTATION, 'utf8'),
  ]);

  assert.match(source, /\.from\('proposals'\)/);
  assert.match(source, /\.eq\('client_id', clientId\)/);
  assert.match(source, /flow_state, flow_completed/);
  assert.match(source, /Propostas do cliente/);
  assert.match(source, /Visualize e gerencie todas as propostas vinculadas a este cliente/);
  assert.match(source, /getProposalStatusLabel\(proposal\.status\)/);
  assert.match(presentation, /draft: \{[\s\S]*label: 'Rascunho'/);
  assert.match(presentation, /pending: \{[\s\S]*label: 'Pronta para envio'/);
  assert.doesNotMatch(presentation, /label: 'Pendente'/);
});

test('listagem geral e visão geral reutilizam a mesma regra de ações', async () => {
  const [clientDetails, proposalList, actions] = await Promise.all([
    readFile(CLIENT_DETAILS, 'utf8'),
    readFile(PROPOSAL_LIST, 'utf8'),
    readFile(ACTIONS, 'utf8'),
  ]);

  assert.match(clientDetails, /<ProposalActionButtons/);
  assert.match(proposalList, /<ProposalActionButtons/);
  assert.match(actions, /const isFlowDraft = isActiveProposalFlowDraft\(proposal\)/);
  assert.match(actions, /isFlowDraft \? \([\s\S]*Continuar[\s\S]*\) : \([\s\S]*title="Visualizar"[\s\S]*title="Editar"[\s\S]*title="Duplicar"[\s\S]*title="Renomear"/);
  assert.match(actions, /title="Excluir"/);
  assert.match(actions, /getProposalContinuePath\(proposal\.id\)/);
  assert.match(actions, /getProposalEditPath\(proposal\.id\)/);
  assert.match(clientDetails, /proposalService\.duplicateProposal\(proposal\.id\)/);
  assert.match(clientDetails, /proposalService\.renameProposal\(proposalToRename\.id, title\)/);
  assert.match(clientDetails, /<RenameProposalModal/);
  assert.match(clientDetails, /<DeleteConfirmModal/);
});
