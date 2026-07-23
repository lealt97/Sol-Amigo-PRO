import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('rota de criação recebe a calculadora profissional e edição permanece vazia', async () => {
  const app = await read('src/App.tsx');

  assert.match(app, /path="propostas\/nova" element={<ProfessionalSolarCalculator \/>}/);
  assert.match(app, /path="propostas\/:id\/editar" element=\{null\}/);
  assert.doesNotMatch(app, /ProposalWizard/);
});

test('documento PDF mantém somente a página de capa', async () => {
  const document = await read('src/components/pdf/ProposalDocument.tsx');

  assert.match(document, /<CoverPage proposal=\{proposal\} \/>/);
  assert.match(document, /<DynamicCoverOverlay proposal=\{proposal\} \/>/);
  assert.equal((document.match(/<Page\b/g) || []).length, 1);
  assert.doesNotMatch(document, /PageSection/);
  assert.doesNotMatch(document, /IntroLetterSection|ExecutiveSummary|EnergyDiagnosisSection|SolarSolutionSection|EquipmentSection|GenerationSection|FinancialSection|TermsSection|WarrantyAndNextStepsSection|AcceptanceSection|PaybackSection/);
});

test('gerador aceita PDF de uma página sem alterar o sistema de capas', async () => {
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const app = await read('src/App.tsx');

  assert.match(generator, /generateSvgCoverImage\(selectedModel, enrichedProposal\)/);
  assert.match(generator, /coverImage=\{coverImage\}/);
  assert.match(generator, /minPages: 1/);
  assert.match(app, /path="design-pdf" element=\{<DesignPdf \/>\}/);
});
