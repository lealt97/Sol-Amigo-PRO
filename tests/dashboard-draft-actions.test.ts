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
  assert.match(source, /draft: \{ label: 'Rascunho'/);
  assert.doesNotMatch(source, /draft: \{ label: 'Pendente'/);
});
