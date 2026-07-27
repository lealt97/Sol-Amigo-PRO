import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const PAYBACK_STEP = 'src/pages/propostas/PaybackStep.tsx';

test('o payback ocupa a penúltima etapa e o resultado permanece por último', async () => {
  const calculator = await readFile(VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'kit', title: 'Kit solar'[\s\S]*id: 'payback', title: 'Payback'[\s\S]*id: 'result', title: 'Resultado'/,
  );
  assert.match(calculator, /currentStep === 5[\s\S]*<PaybackStep/);
  assert.match(calculator, /currentStep === 6[\s\S]*Resultado do dimensionamento/);
  assert.match(calculator, /if \(currentStep === 5 && !paybackResult\)/);
});

test('a etapa contém tarifa, tributos, margem editável, custos e gráfico vertical', async () => {
  const payback = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(payback, /label="Tarifa de energia"/);
  assert.match(payback, /label="PIS"/);
  assert.match(payback, /label="COFINS"/);
  assert.match(payback, /label="ICMS"/);
  assert.match(payback, /label="Outros encargos"/);
  assert.match(payback, /label="Margem de lucro"/);
  assert.match(payback, /default_margin_percentage/);
  assert.match(payback, /Configurações da Conta > Preferências Comerciais/);
  assert.match(payback, /Adicionar custo/);
  assert.match(payback, /<BarChart/);
  assert.match(payback, /<Bar[\s\S]*dataKey="cumulativeBalance"[\s\S]*radius=\{0\}/);
  assert.match(payback, /var\(--color-brand-blue\)/);
  assert.match(payback, /var\(--color-brand-yellow\)/);
  assert.match(payback, /var\(--color-brand-border\)/);
  assert.match(payback, /var\(--color-brand-surface\)/);
  assert.match(payback, /var\(--color-brand-dark\)/);
  assert.match(payback, /var\(--color-slate-500\)/);
  assert.match(payback, /var\(--color-gray-100\)/);
  assert.doesNotMatch(payback, /radius=\{\[5, 5, 0, 0\]\}/);
  assert.doesNotMatch(payback, /#0076DD|#ef4444|#64748b/);
});

test('a etapa apresenta todas as classificações solicitadas', async () => {
  const calculation = await readFile('src/lib/calculations/payback.ts', 'utf8');

  assert.match(calculation, /Excelente/);
  assert.match(calculation, /Muito bom/);
  assert.match(calculation, /Bom/);
  assert.match(calculation, /Regular/);
  assert.match(calculation, /Inviável/);
});
