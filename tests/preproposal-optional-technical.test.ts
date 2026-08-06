import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('pré-proposta não exige telhado, kit ou base interna no preço manual', async () => {
  const [calculator, payback, draft, technical, publicPage] = await Promise.all([
    readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8'),
    readFile('src/pages/propostas/PaybackStepRegulatory.tsx', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
    readFile('src/components/pdf/sections/TechnicalSection.tsx', 'utf8'),
    readFile('src/pages/public/PublicProposal.tsx', 'utf8'),
  ]);

  assert.match(calculator, /Telhado \(opcional\)/);
  assert.doesNotMatch(calculator, /id: 'kit'/);
  assert.match(calculator, /Composição técnica da proposta/);
  assert.match(calculator, /Sem kit cadastrado — informar custo estimado/);
  assert.match(calculator, /hasRoofTechnicalData && !roofOrientationResult/);
  assert.doesNotMatch(calculator, /toast\.error\('Selecione um kit on-grid cadastrado\.'/);
  assert.match(calculator, /selectedKit\?\.name \?\? 'A definir após vistoria'/);
  assert.match(payback, /selectedKit: SolarKit \| null/);
  assert.match(payback, /Base interna de custos/);
  assert.match(payback, /base interna é obrigatória apenas quando o preço for calculado pela margem/i);
  assert.match(payback, /O payback está sendo calculado pelo preço comercial/i);
  assert.match(payback, /Margem de lucro/);
  assert.match(draft, /pricingMode\?: 'margin' \| 'manual'/);
  assert.match(draft, /flowLayout\?: 'kit-in-payback'/);
  assert.match(technical, /Solução Técnica Preliminar/);
  assert.match(technical, /Esta é uma pré-proposta comercial/);
  assert.match(publicPage, /Pré-proposta Comercial/);
  assert.match(publicPage, /ajustados após a vistoria técnica/);
});
