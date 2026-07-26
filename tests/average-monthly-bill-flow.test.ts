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
  assert.match(source, /A tarifa continua sendo a base técnica do payback/);
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
