import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('dashboard aplica a regra de rascunho ativo: continuar e excluir', async () => {
  const source = await readFile('src/pages/Dashboard.tsx', 'utf8');

  assert.match(source, /flow_state, flow_completed/);
  assert.match(source, /isActiveProposalFlowDraft/);
  assert.match(source, /getProposalContinuePath/);
  assert.match(source, /isActiveProposalFlowDraft\(proposal\) \? \([\s\S]*Continuar[\s\S]*\) : \([\s\S]*title="Visualizar"/);
  assert.match(source, /title="Excluir"/);
});

test('dashboard separa todas as etapas do ciclo comercial', async () => {
  const source = await readFile('src/pages/Dashboard.tsx', 'utf8');

  assert.match(source, /getProposalStatusPresentation/);
  assert.match(source, /Rascunhos/);
  assert.match(source, /Prontas para envio/);
  assert.match(source, /Enviadas/);
  assert.match(source, /Visualizadas/);
  assert.match(source, /Aprovadas/);
  assert.match(source, /Recusadas/);
  assert.match(source, /Expiradas/);
  assert.doesNotMatch(source, /Em análise|label: 'Pendente'/);
});
