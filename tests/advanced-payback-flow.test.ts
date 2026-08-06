import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('a etapa de payback expõe premissas avançadas e indicadores financeiros', async () => {
  const [step, engine, draft] = await Promise.all([
    readFile('src/pages/propostas/PaybackStepRegulatory.tsx', 'utf8'),
    readFile('src/lib/calculations/paybackEngine.ts', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
  ]);

  assert.match(step, /Premissas financeiras avançadas/);
  assert.match(step, /Reajuste anual da tarifa/);
  assert.match(step, /Degradação anual da geração/);
  assert.match(step, /Operação e manutenção anual/);
  assert.match(step, /Taxa de desconto \/ TMA/);
  assert.match(step, /Fator efetivo de compensação/);
  assert.match(step, /Ano de troca do inversor/);
  assert.match(step, /Payback simples/);
  assert.match(step, /Payback descontado/);
  assert.match(step, /VPL em/);
  assert.match(step, /TIR estimada/);
  assert.match(step, /discountedCumulativeBalance/);

  assert.match(engine, /netPresentValue/);
  assert.match(engine, /internalRateOfReturnPercent/);
  assert.match(engine, /annualGenerationDegradationPercent/);
  assert.match(engine, /compensationFactorPercent/);
  assert.match(engine, /lifetimeDistributedGenerationCharges/);

  assert.match(draft, /analysisYears\?: string/);
  assert.match(draft, /discountRatePercent\?: string/);
  assert.match(draft, /inverterReplacementCost\?: string/);
  assert.match(draft, /distributedGenerationRegime\?: DistributedGenerationRegime/);
  assert.match(draft, /fioBTariffCentsPerKwh\?: string/);
});
