import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('pré-proposta não exige telhado nem kit e mantém ressalva de vistoria', async () => {
  const [calculator, payback, draft, technical, publicPage] = await Promise.all([
    readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8'),
    readFile('src/pages/propostas/PaybackStep.tsx', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
    readFile('src/components/pdf/sections/TechnicalSection.tsx', 'utf8'),
    readFile('src/pages/public/PublicProposal.tsx', 'utf8'),
  ]);

  assert.match(calculator, /Telhado \(opcional\)/);
  assert.match(calculator, /Kit de referência \(opcional\)/);
  assert.match(calculator, /hasRoofTechnicalData && !roofOrientationResult/);
  assert.doesNotMatch(calculator, /toast\.error\('Selecione um kit on-grid cadastrado\.'/);
  assert.match(calculator, /selectedKit\?\.name \?\? 'A definir após vistoria'/);
  assert.match(payback, /selectedKit: SolarKit \| null/);
  assert.match(payback, /Preço da proposta/);
  assert.match(payback, /não depende da seleção de um kit/);
  assert.match(draft, /proposalPrice\?: string/);
  assert.match(draft, /estimatedSystemCost\?: string/);
  assert.match(technical, /Solução Técnica Preliminar/);
  assert.match(technical, /Esta é uma pré-proposta comercial/);
  assert.match(publicPage, /Pré-proposta Comercial/);
  assert.match(publicPage, /ajustados após a vistoria técnica/);
});
