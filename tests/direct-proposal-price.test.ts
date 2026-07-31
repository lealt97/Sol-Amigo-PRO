import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preço comercial é independente do kit e o kit fica como referência', async () => {
  const [payback, engine, calculator, draft] = await Promise.all([
    readFile('src/pages/propostas/PaybackStep.tsx', 'utf8'),
    readFile('src/lib/calculations/payback.ts', 'utf8'),
    readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
  ]);

  assert.match(payback, /label="Preço da proposta"/);
  assert.match(payback, /Este valor não depende da seleção de um kit/);
  assert.match(payback, /kitCost: selectedKit\?\.cost_price \?\? null/);
  assert.doesNotMatch(payback, /label="Margem de lucro"/);
  assert.match(engine, /proposalPrice: number/);
  assert.match(engine, /const totalInvestment = input\.proposalPrice/);
  assert.match(engine, /hasCostBasis/);
  assert.match(calculator, /Preço e payback/);
  assert.match(calculator, /final_price: proposalPrice/);
  assert.match(draft, /proposalPrice\?: string/);
});
