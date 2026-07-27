import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PAYBACK_STEP = 'src/pages/propostas/PaybackStep.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const DRAFT = 'src/types/proposalDraft.ts';
const SERVICE = 'src/services/proposalService.ts';

test('o payback aceita fatura média opcional e exibe comparação comercial', async () => {
  const source = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(source, /label="Valor médio mensal da fatura"/);
  assert.match(source, /prefix="R\$"/);
  assert.match(source, /Comparação da fatura/);
  assert.match(source, /Fatura residual estimada/);
  assert.match(source, /Redução estimada/);
  assert.match(source, /Revise a tarifa ou os dados da fatura/);
  assert.match(source, /valores fixos e cobranças não compensáveis continuam na fatura/);
});

test('a fatura e o snapshot econômico são persistidos no rascunho', async () => {
  const [draft, calculator, service, step] = await Promise.all([
    readFile(DRAFT, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
    readFile(SERVICE, 'utf8'),
    readFile(PAYBACK_STEP, 'utf8'),
  ]);

  assert.match(draft, /averageMonthlyBillAmount\?: string/);
  assert.match(draft, /calculationSnapshot\?: ProposalDraftPaybackCalculationSnapshot/);
  assert.match(step, /buildCalculationSnapshot/);
  assert.match(calculator, /bill_amount: billAmount/);
  assert.match(calculator, /Fatura média atual/);
  assert.match(calculator, /Fatura residual estimada/);
  assert.match(service, /\| 'bill_amount'/);
});

test('a hidratação por kit evita ciclo infinito entre filho e pai', async () => {
  const source = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(source, /hydratedStorageKeyRef/);
  assert.match(source, /hydratedStorageKeyRef\.current === storageKey/);
  assert.match(source, /JSON\.stringify\(currentSnapshot\) === JSON\.stringify\(nextSnapshot\)/);
});
