import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const PAYBACK_EXPERIENCE = 'src/pages/propostas/PaybackStep.tsx';
const PAYBACK_STEP = 'src/pages/propostas/PaybackStepRegulatory.tsx';
const PAYBACK_ENGINE = 'src/lib/calculations/paybackEngine.ts';
const COMMERCIAL_ALERT = 'src/pages/propostas/CommercialProfitabilityAlert.tsx';

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
  assert.match(payback, /label="Margem de lucro desejada"/);
  assert.match(payback, /label="Preço da proposta"/);
  assert.match(payback, /label="Base interna de custos"/);
  assert.match(payback, /defaultMargin = 30/);
  assert.match(payback, /profile\.default_margin_percentage/);
  assert.match(payback, /manualSystemCost/);
  assert.match(payback, /Adicionar custo/);
  assert.match(payback, /Payback descontado/);
  assert.match(payback, /TIR estimada/);
});

test('a experiência final separa informações do cliente e dados comerciais internos', async () => {
  const experience = await readFile(PAYBACK_EXPERIENCE, 'utf8');
  const commercialAlert = await readFile(COMMERCIAL_ALERT, 'utf8');

  assert.match(experience, /Resumo final da proposta/);
  assert.match(experience, /Visível ao cliente/);
  assert.match(experience, /Dados internos separados/);
  assert.match(experience, /Preço comercial/);
  assert.match(experience, /Retorno projetado/);
  assert.match(experience, /Economia mensal estimada/);
  assert.match(experience, /Uso interno — não incluir na proposta/);
  assert.match(experience, /Configuração comercial e regulatória/);
  assert.match(experience, /Perfil mensal de energia/);
  assert.match(experience, /Banco de créditos/);
  assert.match(experience, /Comparação da fatura/);
  assert.match(experience, /aria-label="Navegação da etapa de preço e payback"/);

  assert.match(commercialAlert, /Segurança comercial da venda/);
  assert.match(commercialAlert, /Ação comercial recomendada/);
  assert.match(commercialAlert, /Margem efetiva \/ meta/);
  assert.match(commercialAlert, /Venda protegida/);
  assert.match(commercialAlert, /Requer revisão/);
});

test('o motor usa payback simples oficial com fluxo de caixa mensal', async () => {
  const calculation = await readFile(PAYBACK_ENGINE, 'utf8');

  assert.match(calculation, /OFFICIAL_PAYBACK_METHOD = 'simple'/);
  assert.match(calculation, /PAYBACK_CASH_FLOW_RESOLUTION = 'monthly'/);
  assert.match(calculation, /monthlyData: PaybackMonthlyPoint\[\]/);
  assert.match(calculation, /for \(let month = 1; month <= analysisMonths; month \+= 1\)/);
  assert.match(calculation, /simplePaybackMonthsExact = crossingPeriods/);
  assert.match(calculation, /aggregateAnnualChart\(monthlyData, analysisYears\)/);
});

test('a interface apresenta o retorno oficial em anos e meses', async () => {
  const payback = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(payback, /formatPaybackPeriod/);
  assert.match(payback, /Prazo de retorno projetado/);
  assert.match(payback, /calculado mês a mês/);
  assert.match(payback, /o gráfico consolida os resultados por ano/);
});

test('o motor separa autoconsumo, energia compensada e encargos da geração distribuída', async () => {
  const calculation = await readFile(PAYBACK_ENGINE, 'utf8');

  assert.match(calculation, /simultaneousSelfConsumptionPercent/);
  assert.match(calculation, /gridCompensatedEnergyKwh/);
  assert.match(calculation, /distributedGenerationCharges/);
  assert.match(calculation, /usesPostTransitionAssumption/);
});

test('a interface permite enquadrar GD e informar as componentes tarifárias', async () => {
  const payback = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(payback, /Enquadramento da geração distribuída e Fio B/);
  assert.match(payback, /GD I — direito adquirido até 2045/);
  assert.match(payback, /GD II — transição do art\. 27/);
  assert.match(payback, /GD III — minigeração especial acima de 500 kW/);
  assert.match(payback, /Componente tarifária Fio B/);
  assert.match(payback, /Autoconsumo instantâneo/);
  assert.match(payback, /60% do Fio B/);
});

test('a etapa apresenta todas as classificações solicitadas', async () => {
  const calculation = await readFile(PAYBACK_ENGINE, 'utf8');

  assert.match(calculation, /Excelente/);
  assert.match(calculation, /Muito bom/);
  assert.match(calculation, /Bom/);
  assert.match(calculation, /Regular/);
  assert.match(calculation, /Inviável/);
});
