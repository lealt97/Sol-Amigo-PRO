import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  clampProposalFlowStep,
  getProposalContinuePath,
  isActiveProposalFlowDraft,
} from '../src/lib/proposals/flow';

const APP = 'src/App.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const LIST = 'src/pages/propostas/ProposalList.tsx';
const DETAILS = 'src/pages/propostas/ProposalDetails.tsx';
const ACTIONS = 'src/components/proposals/ProposalActionButtons.tsx';
const PAYBACK = 'src/pages/propostas/PaybackStep.tsx';
const SERVICE = 'src/services/proposalService.ts';
const SCHEMA = 'supabase-schema.sql';

test('identifica somente rascunhos ativos do fluxo e limita a etapa salva', () => {
  assert.equal(isActiveProposalFlowDraft({ status: 'draft', flow_state: { version: 1 }, flow_completed: false } as never), true);
  assert.equal(isActiveProposalFlowDraft({ status: 'pending', flow_state: { version: 1 }, flow_completed: true } as never), false);
  assert.equal(isActiveProposalFlowDraft({ status: 'draft', flow_state: null, flow_completed: false } as never), false);
  assert.equal(clampProposalFlowStep(-2), 0);
  assert.equal(clampProposalFlowStep(4), 4);
  assert.equal(clampProposalFlowStep(99), 6);
  assert.equal(getProposalContinuePath('proposal-id'), '/propostas/proposal-id/continuar');
});

test('o fluxo possui rota de continuação e salva antes de avançar', async () => {
  const [app, calculator] = await Promise.all([
    readFile(APP, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(app, /path="propostas\/:id\/continuar" element=\{<ProfessionalSizingCalculator \/>\}/);
  assert.match(calculator, /proposalService\.getFlowDraftById\(draftIdFromRoute\)/);
  assert.match(calculator, /hydrateProposalDraft\(proposal\.flow_state, proposal\.title \|\| '', isEditMode\)/);
  assert.match(calculator, /const goNext = async \(\) =>/);
  assert.match(calculator, /await persistDraftStep\(nextStep\)[\s\S]*setCurrentStep\(nextStep\)/);
  assert.match(calculator, /proposalService\.createOrResumeFlowDraft/);
  assert.match(calculator, /proposalService\.saveFlowDraft/);
  assert.match(calculator, /proposalService\.completeFlowDraft/);
  assert.match(calculator, /Rascunho salvo automaticamente/);
  assert.match(calculator, /disabled=\{Boolean\(draftId\)\}/);
});

test('o estado persistido cobre consumo, telhado, foto, kit e payback', async () => {
  const [calculator, payback] = await Promise.all([
    readFile(CALCULATOR, 'utf8'),
    readFile(PAYBACK, 'utf8'),
  ]);

  assert.match(calculator, /currentStep: step/);
  assert.match(calculator, /monthlyConsumption,/);
  assert.match(calculator, /loadSurvey,/);
  assert.match(calculator, /roofPhotoReference,/);
  assert.match(calculator, /selectedKitId,/);
  assert.match(calculator, /paybackForm,/);
  assert.match(calculator, /initialStorageReference=\{roofPhotoReference\}/);
  assert.match(calculator, /initialForm=\{paybackForm\}/);
  assert.match(calculator, /onDraftChange=\{setPaybackForm\}/);
  assert.match(payback, /initialForm\?: ProposalDraftPaybackForm \| null/);
  assert.match(payback, /onDraftChange\?: \(form: ProposalDraftPaybackForm\) => void/);
});

test('não cria uma segunda proposta ativa para o mesmo cliente', async () => {
  const [service, schema] = await Promise.all([
    readFile(SERVICE, 'utf8'),
    readFile(SCHEMA, 'utf8'),
  ]);

  assert.match(service, /findActiveFlowDraftByClient\(input\.userId, input\.clientId\)/);
  assert.match(service, /if \(existing\) return \{ proposal: existing, resumed: true \}/);
  assert.match(service, /error\.code === '23505'/);
  assert.match(service, /\.eq\('status', 'draft'\)[\s\S]*\.eq\('flow_completed', false\)[\s\S]*\.not\('flow_state', 'is', null\)/);
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS proposals_one_active_flow_draft_per_client_uidx/);
});

test('rascunho em fluxo oferece somente continuar e excluir em todas as listagens', async () => {
  const [list, actions, details] = await Promise.all([
    readFile(LIST, 'utf8'),
    readFile(ACTIONS, 'utf8'),
    readFile(DETAILS, 'utf8'),
  ]);

  assert.match(list, /<ProposalActionButtons/);
  assert.match(actions, /const isFlowDraft = isActiveProposalFlowDraft\(proposal\)/);
  assert.match(actions, /isFlowDraft \? \([\s\S]*Continuar[\s\S]*\) : \([\s\S]*title="Visualizar"[\s\S]*title="Editar"[\s\S]*title="Duplicar"[\s\S]*title="Renomear"/);
  assert.match(actions, /title="Excluir"/);
  assert.match(list, /<option value="pending">Pronta para envio<\/option>/);
  assert.doesNotMatch(list, /pending_like|>Pendente<\/option>/);
  assert.match(details, /if \(isActiveProposalFlowDraft\(proposal\)\)[\s\S]*<Navigate to=\{getProposalContinuePath\(proposal\.id\)\} replace/);
});
