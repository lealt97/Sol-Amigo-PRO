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

test('documento PDF mantém a capa e renderiza as páginas configuradas da proposta', async () => {
  const document = await read('src/components/pdf/ProposalDocument.tsx');
  const pages = await read('src/components/pdf/sections/ProposalPages.tsx');

  assert.match(document, /<CoverPage proposal=\{proposal\} \/>/);
  assert.match(document, /<Image src=\{coverImage\} style=\{styles\.coverImage\} \/>/);
  assert.match(document, /getVisibleProposalPages\(pageConfig\)/);
  assert.match(document, /<IntroPage/);
  assert.match(document, /<ConsumptionPage/);
  assert.match(document, /<TechnicalPage/);
  assert.match(document, /<KitPage/);
  assert.match(document, /<RoofPage/);
  assert.match(document, /<TimelinePage/);
  assert.match(document, /<FinancialPage/);
  assert.match(document, /<PaybackPage/);
  assert.match(document, /<AcceptancePage/);
  assert.match(pages, /index % 2 === 0 \? '#FFFFFF' : theme\.primarySoft/);
  assert.doesNotMatch(document, /DynamicCoverOverlay/);
});

test('editor de páginas navega pelo preview e mantém a capa obrigatória', async () => {
  const editor = await read('src/features/design-pdf/components/PageConfigEditor.tsx');
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const designEditor = await read('src/features/design-pdf/components/DesignPdfEditor.tsx');

  assert.match(editor, /onNavigate\?\.\(page\.key\)/);
  assert.match(editor, /page\.key === 'cover'/);
  assert.match(editor, /absolute left-0\.5 top-0\.5 h-5 w-5/);
  assert.match(editor, /checked \? 'translate-x-5' : 'translate-x-0'/);
  assert.match(preview, /scrollToPage/);
  assert.match(preview, /data-pdf-page=\{page\.key\}/);
  assert.match(designEditor, /previewRef\.current\?\.scrollToPage\(pageKey\)/);
});

test('ações dos modelos PDF usam o mesmo overlay no mobile e no desktop', async () => {
  const carousel = await read('src/features/design-pdf/components/UserModelCarousel.tsx');

  assert.doesNotMatch(carousel, /@radix-ui\/react-dropdown-menu/);
  assert.doesNotMatch(carousel, /MoreHorizontal/);
  assert.match(carousel, /openActionsModelId/);
  assert.match(carousel, /actionsAreOpen/);
  assert.match(carousel, /group-hover:pointer-events-auto/);
  assert.match(carousel, /group-focus-within:pointer-events-auto/);
  assert.match(carousel, /actionsAreOpen \? 'pointer-events-auto opacity-100'/);
  assert.match(carousel, /Toque ou pressione Enter para exibir as ações/);
  assert.match(carousel, /Editar modelo/);
  assert.match(carousel, /Duplicar modelo/);
  assert.match(carousel, /Excluir modelo/);
  assert.match(carousel, /h-11 w-11/);
  assert.match(carousel, /focus-visible:ring-2/);
  assert.match(carousel, /onKeyDown=\{handleCardKeyDown\}/);
  assert.match(carousel, /aria-current=/);
});

test('adicionar modelo padrão usa o mesmo overlay no mobile e no desktop', async () => {
  const carousel = await read('src/features/design-pdf/components/TemplateCarousel.tsx');

  assert.doesNotMatch(carousel, /components\/ui\/Button/);
  assert.match(carousel, /openPresetId/);
  assert.match(carousel, /actionsAreOpen/);
  assert.match(carousel, /group-hover:pointer-events-auto/);
  assert.match(carousel, /group-focus-within:pointer-events-auto/);
  assert.match(carousel, /actionsAreOpen \? 'pointer-events-auto opacity-100'/);
  assert.match(carousel, /Toque ou pressione Enter para adicionar/);
  assert.match(carousel, /Adicionar modelo/);
  assert.match(carousel, /min-h-11/);
  assert.match(carousel, /focus-visible:ring-2/);
  assert.match(carousel, /onKeyDown=\{handleCardKeyDown\}/);
  assert.match(carousel, /aria-expanded=/);
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

test('gerador usa tema e configuração de páginas do modelo selecionado', async () => {
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const app = await read('src/App.tsx');

  assert.match(generator, /generateSvgCoverImage\(selectedModel, enrichedProposal\)/);
  assert.match(generator, /coverImage=\{coverImage\}/);
  assert.match(generator, /pdfTheme=\{selectedModel\?\.theme\}/);
  assert.match(generator, /pageConfig=\{selectedModel\?\.page_config\}/);
  assert.match(generator, /minPages: 1/);
  assert.match(app, /path="design-pdf" element=\{<DesignPdf \/>\}/);
});
