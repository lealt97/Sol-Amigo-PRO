import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const PAYBACK_STEP = 'src/pages/propostas/PaybackStep.tsx';

test('kit deixa de ser etapa e passa a integrar preço e payback', async () => {
  const calculator = await readFile(VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'modules', title: 'Telhado \(opcional\)'[\s\S]*id: 'payback', title: 'Preço e payback'[\s\S]*id: 'result', title: 'Resultado'/,
  );
  assert.doesNotMatch(calculator, /id: 'kit'/);
  assert.match(calculator, /currentStep === 4[\s\S]*Composição técnica da proposta[\s\S]*<PaybackStep/);
  assert.match(calculator, /currentStep === 5[\s\S]*Resultado do dimensionamento/);
  assert.match(calculator, /if \(currentStep === 4 && !paybackResult\)/);
  assert.match(calculator, /Sem kit cadastrado — informar custo estimado/);
});

test('a etapa oferece preço por margem ou manual e mantém análise financeira avançada', async () => {
  const payback = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(payback, /Calcular pela margem/);
  assert.match(payback, /Informar preço manual/);
  assert.match(payback, /label=\"Margem de lucro\"/);
  assert.match(payback, /label=\"Preço da proposta\"/);
  assert.match(payback, /label=\"Custo estimado do sistema\"/);
  assert.match(payback, /defaultMargin = 30/);
  assert.match(payback, /profile\.default_margin_percentage/);
  assert.match(payback, /manualSystemCost/);
  assert.match(payback, /Adicionar custo/);
  assert.match(payback, /Payback descontado/);
  assert.match(payback, /TIR estimada/);
  assert.match(payback, /<BarChart/);
  assert.match(payback, /dataKey=\"cumulativeBalance\"/);
  assert.match(payback, /dataKey=\"discountedCumulativeBalance\"/);
});

test('a etapa apresenta todas as classificações solicitadas', async () => {
  const calculation = await readFile('src/lib/calculations/payback.ts', 'utf8');

  assert.match(calculation, /Excelente/);
  assert.match(calculation, /Muito bom/);
  assert.match(calculation, /Bom/);
  assert.match(calculation, /Regular/);
  assert.match(calculation, /Inviável/);
});
