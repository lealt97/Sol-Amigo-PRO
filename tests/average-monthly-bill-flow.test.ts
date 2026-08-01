import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PAYBACK_STEP = 'src/pages/propostas/PaybackStepRegulatory.tsx';
const PAYBACK_WRAPPER = 'src/pages/propostas/PaybackStep.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const DRAFT = 'src/types/proposalDraft.ts';
const SERVICE = 'src/services/proposalService.ts';

test('o payback aceita fatura média opcional e exibe comparação comercial', async () => {
  const [step, wrapper] = await Promise.all([
    readFile(PAYBACK_STEP, 'utf8'),
    readFile(PAYBACK_WRAPPER, 'utf8'),
  ]);

  assert.match(step, /label="Valor médio mensal da fatura"/);
  assert.match(step, /prefix="R\$"/);
  assert.match(wrapper, /comparação da fatura/i);
  assert.match(wrapper, /Fatura residual estimada/);
  assert.match(wrapper, /Redução estimada/);
  assert.match(wrapper, /Revise a tarifa ou os dados da fatura/);
  assert.match(wrapper, /A tarifa continua sendo a base técnica do payback/);
});

test('a fatura é persistida no rascunho e na proposta final', async () => {
  const [draft, calculator, service] = await Promise.all([
    readFile(DRAFT, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
    readFile(SERVICE, 'utf8'),
  ]);

  assert.match(draft, /averageMonthlyBillAmount\?: string/);
  assert.match(calculator, /bill_amount: billAmount/);
  assert.match(calculator, /Fatura média atual/);
  assert.match(calculator, /Fatura residual estimada/);
  assert.match(service, /\| 'bill_amount'/);
});

test('a referência inicial é estabilizada para evitar ciclo entre filho e pai', async () => {
  const wrapper = await readFile(PAYBACK_WRAPPER, 'utf8');

  assert.match(wrapper, /function useStableInitialForm/);
  assert.match(wrapper, /const serialized = JSON\.stringify\(value\)/);
  assert.match(wrapper, /reference\.current\.serialized !== serialized/);
  assert.match(wrapper, /initialForm=\{stableInitialForm\}/);
});
