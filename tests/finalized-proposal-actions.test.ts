import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const APP = 'src/App.tsx';
const LIST = 'src/pages/propostas/ProposalList.tsx';
const WIZARD = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const SERVICE = 'src/services/proposalService.ts';
const DRAFT_TYPE = 'src/types/proposalDraft.ts';

test('proposta finalizada possui visualizar, editar, duplicar, renomear e excluir', async () => {
  const [list, app, service] = await Promise.all([
    readFile(LIST, 'utf8'),
    readFile(APP, 'utf8'),
    readFile(SERVICE, 'utf8'),
  ]);

  assert.match(app, /path="propostas\/:id\/editar" element=\{<ProfessionalSizingCalculator \/>\}/);
  assert.match(list, /title="Visualizar"/);
  assert.match(list, /title="Editar"/);
  assert.match(list, /title="Duplicar"/);
  assert.match(list, /title="Renomear"/);
  assert.match(list, /title="Excluir"/);
  assert.match(list, /proposalService\.duplicateProposal/);
  assert.match(list, /proposalService\.renameProposal/);
  assert.match(service, /async function getEditableProposalById/);
  assert.match(service, /async function saveCompletedProposal/);
  assert.match(service, /async function duplicateProposal/);
  assert.match(service, /async function renameProposal/);
});

test('rascunho em fluxo continua limitado a continuar e excluir', async () => {
  const list = await readFile(LIST, 'utf8');

  assert.match(
    list,
    /isFlowDraft \? \([\s\S]*Continuar[\s\S]*\) : \([\s\S]*title="Visualizar"[\s\S]*title="Editar"[\s\S]*title="Duplicar"[\s\S]*title="Renomear"/,
  );
  assert.match(list, /title="Excluir"/);
});

test('o nome da proposta é informado na etapa Cliente e persistido no fluxo', async () => {
  const [wizard, draftType] = await Promise.all([
    readFile(WIZARD, 'utf8'),
    readFile(DRAFT_TYPE, 'utf8'),
  ]);

  assert.match(wizard, /const \[proposalTitle, setProposalTitle\] = useState\(''\)/);
  assert.match(wizard, /Nome da proposta \*/);
  assert.match(wizard, /placeholder="Ex\.: Sistema fotovoltaico — Residência Silva"/);
  assert.match(wizard, /proposalTitle: proposalTitle\.trim\(\)\.replace/);
  assert.match(wizard, /title: proposalTitle\.trim\(\)\.replace/);
  assert.match(draftType, /proposalTitle\?: string/);
});

test('edição usa o mesmo Wizard sem transformar a proposta em rascunho', async () => {
  const [wizard, service] = await Promise.all([
    readFile(WIZARD, 'utf8'),
    readFile(SERVICE, 'utf8'),
  ]);

  assert.match(wizard, /const isEditMode = location\.pathname\.endsWith\('\/editar'\)/);
  assert.match(wizard, /proposalService\.getEditableProposalById/);
  assert.match(wizard, /proposalService\.saveCompletedProposal/);
  assert.match(wizard, /isEditMode \? 'Salvar alterações' : 'Concluir dimensionamento'/);
  assert.match(service, /saveCompletedProposal[\s\S]*flow_completed: true/);
  assert.doesNotMatch(service, /saveCompletedProposal[\s\S]{0,500}status: 'draft'/);
});
