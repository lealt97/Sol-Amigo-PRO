import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('rota de criação recebe a calculadora por kit e edição permanece vazia', async () => {
  const app = await read('src/App.tsx');

  assert.match(app, /path="propostas\/nova" element=\{<ProfessionalSizingCalculator \/>\}/);
  assert.match(app, /path="propostas\/:id\/editar" element=\{<ProfessionalSizingCalculator \/>\}/);
  assert.doesNotMatch(app, /ProposalWizard/);
});

test('documento PDF mantém somente a página de capa sem sobreposição duplicada', async () => {
  const document = await read('src/components/pdf/ProposalDocument.tsx');

  assert.match(document, /<CoverPage proposal=\{proposal\} \/>/);
  assert.match(document, /<Image src=\{coverImage\} style=\{styles\.coverImage\} \/>/);
  assert.doesNotMatch(document, /DynamicCoverOverlay/);
  assert.equal((document.match(/<Page\b/g) || []).length, 1);
  assert.doesNotMatch(document, /PageSection/);
  assert.doesNotMatch(document, /IntroLetterSection|ExecutiveSummary|EnergyDiagnosisSection|SolarSolutionSection|EquipmentSection|GenerationSection|FinancialSection|TermsSection|WarrantyAndNextStepsSection|AcceptanceSection|PaybackSection/);
});

test('textos dinâmicos da capa recebem ampliação controlada', async () => {
  const coverEngine = await read('src/lib/pdf/utils/coverSvgEngine.ts');

  assert.match(coverEngine, /clientName: \{ scale: 1\.35, maxSize: 24 \}/);
  assert.match(coverEngine, /powerKwp: \{ scale: 1\.35, maxSize: 32 \}/);
  assert.match(coverEngine, /cityState: \{ scale: 1\.3, maxSize: 20 \}/);
  assert.match(coverEngine, /date: \{ scale: 1\.2, maxSize: 17 \}/);
  assert.match(coverEngine, /validityText: \{ scale: 1\.2, maxSize: 14 \}/);
  assert.match(coverEngine, /return enlargeDynamicCoverTexts\(svg\)/);
});

test('gerador aceita PDF de uma página sem alterar o sistema de capas', async () => {
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const app = await read('src/App.tsx');

  assert.match(generator, /generateSvgCoverImage\(selectedModel, enrichedProposal\)/);
  assert.match(generator, /coverImage=\{coverImage\}/);
  assert.match(generator, /minPages: 1/);
  assert.match(app, /path="design-pdf" element=\{<DesignPdf \/>\}/);
});
