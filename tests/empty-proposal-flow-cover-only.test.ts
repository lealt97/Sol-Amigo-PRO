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

test('documento PDF mantém A4 e renderiza exatamente as páginas configuradas', async () => {
  const document = await read('src/components/pdf/ProposalDocument.tsx');

  assert.match(document, /const visiblePages = getVisibleProposalPages\(pageConfig\)/);
  assert.match(document, /const pagesToRender = previewPageKey/);
  assert.match(document, /visiblePages\.flatMap/);
  assert.match(document, /page\.key === previewPageKey/);
  assert.match(document, /pageNumber: index \+ 1/);
  assert.match(document, /size="A4"/);
  assert.match(document, /<CoverPage proposal=\{proposal\} \/>/);
  assert.match(document, /<Image src=\{coverImage\} style=\{styles\.coverImage\} \/>/);
  assert.doesNotMatch(document, /shouldRenderPage/);
  assert.doesNotMatch(document, /\.filter\(\(\{ key \}\) =>/);
  assert.match(document, /<IntroPage/);
  assert.match(document, /<ConsumptionPage/);
  assert.match(document, /<TechnicalPage/);
  assert.match(document, /<KitPage/);
  assert.match(document, /<RoofPage/);
  assert.match(document, /<TimelineTallPage/);
  assert.match(document, /<FinancialPage/);
  assert.match(document, /<PaybackPage/);
  assert.match(document, /<AcceptancePage/);
  assert.match(document, /illustration=\{illustrationImages\.kit\}/);
  assert.match(document, /illustration=\{illustrationImages\.timeline\}/);
  assert.match(document, /illustration=\{illustrationImages\.financial\}/);
});

test('editor solicita a página ativa ao mesmo renderizador usado pela exportação', async () => {
  const editor = await read('src/features/design-pdf/components/PageConfigEditor.tsx');
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const designEditor = await read('src/features/design-pdf/components/DesignPdfEditor.tsx');

  assert.match(editor, /onNavigate\?\.\(page\.key\)/);
  assert.match(editor, /page\.key === 'cover'/);
  assert.match(preview, /import\('\.\.\/\.\.\/\.\.\/lib\/pdf\/generateProposalPdf'\)/);
  assert.match(preview, /renderProposalPdfBlob\([\s\S]*request\.proposal,[\s\S]*request\.model,[\s\S]*previewPageKey: request\.activePageKey/);
  assert.match(preview, /URL\.createObjectURL\(blob\)/);
  assert.match(preview, /Visualização exata do PDF da proposta/);
  assert.match(preview, /zoom=page-width/);
  assert.doesNotMatch(preview, /@react-pdf\/renderer/);
  assert.doesNotMatch(preview, /ProposalPreviewPage/);
  assert.doesNotMatch(preview, /TimelineTallPreview/);
  assert.doesNotMatch(preview, /ProposalPagesPreviewWithVectorArt/);
  assert.match(designEditor, /previewRef\.current\?\.scrollToPage\(pageKey\)/);
});

test('preview começa no próximo frame, elimina debounce e descarta renders intermediários', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(preview, /window\.requestAnimationFrame/);
  assert.match(preview, /latestRequestRef/);
  assert.match(preview, /renderingRef/);
  assert.match(preview, /request\.sequence !== renderSequenceRef\.current/);
  assert.match(preview, /if \(latestRequestRef\.current\)/);
  assert.doesNotMatch(preview, /window\.setTimeout/);
});

test('preview e exportação compartilham uma única função geradora de blob', async () => {
  const sharedAssets = await read('src/lib/pdf/renderProposalDocument.tsx');
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');

  assert.match(sharedAssets, /generateSvgCoverImage\(model, proposal\)/);
  assert.match(sharedAssets, /prepareIllustrationsForPage/);
  assert.match(sharedAssets, /buildProposalIllustrationImages\(resolvedTheme\)/);
  assert.match(sharedAssets, /shouldPrepareCover/);
  assert.match(sharedAssets, /Promise\.all/);
  assert.match(sharedAssets, /pageConfig: model\?\.page_config \?\? null/);
  assert.match(generator, /export async function renderProposalPdfBlob/);
  assert.match(generator, /prepareProposalDocumentAssets\(\{[\s\S]*proposal,[\s\S]*model,[\s\S]*previewPageKey/);
  assert.match(generator, /<ProposalDocument[\s\S]*proposal=\{proposal\}[\s\S]*previewPageKey=\{previewPageKey\}/);
  assert.match(generator, /renderProposalPdfBlob\(enrichedProposal, selectedModel\)/);
  assert.match(preview, /renderProposalPdfBlob\([\s\S]*previewPageKey: request\.activePageKey/);
  assert.doesNotMatch(preview, /prepareProposalDocumentAssets/);
});

test('alterar somente o nome do modelo não força nova renderização do PDF', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(preview, /const renderModel = useMemo/);
  assert.match(preview, /model\.preset_id/);
  assert.match(preview, /model\.theme/);
  assert.match(preview, /model\.page_config/);
  assert.doesNotMatch(preview, /model\.name,[\s\S]*\],\n  \);/);
});

test('ações dos modelos adicionados alternam por toque somente no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/UserModelCarousel.tsx');

  assert.doesNotMatch(carousel, /@radix-ui\/react-dropdown-menu/);
  assert.match(carousel, /useTouchOnlyDevice/);
  assert.match(carousel, /const isTouchOnlyDevice = useTouchOnlyDevice\(\)/);
  assert.match(carousel, /if \(!isTouchOnlyDevice\) return/);
  assert.match(carousel, /current === model\.id \? null : model\.id/);
  assert.match(carousel, /onClick=\{handleCardClick\}/);
  assert.match(carousel, /desktopRevealClassName/);
  assert.match(carousel, /group-hover:pointer-events-auto/);
  assert.match(carousel, /group-focus-within:pointer-events-auto/);
  assert.match(carousel, /actionsAreOpen \? 'pointer-events-auto opacity-100'/);
  assert.match(carousel, /Toque para mostrar ou ocultar as ações/);
  assert.match(carousel, /Editar modelo/);
  assert.match(carousel, /Duplicar modelo/);
  assert.match(carousel, /Excluir modelo/);
  assert.match(carousel, /h-11 w-11/);
  assert.match(carousel, /focus-visible:ring-2/);
  assert.match(carousel, /aria-expanded=\{isActive && isTouchOnlyDevice/);
});

test('adicionar modelo padrão alterna por toque somente no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/TemplateCarousel.tsx');

  assert.doesNotMatch(carousel, /components\/ui\/Button/);
  assert.match(carousel, /useTouchOnlyDevice/);
  assert.match(carousel, /const isTouchOnlyDevice = useTouchOnlyDevice\(\)/);
  assert.match(carousel, /if \(!isTouchOnlyDevice\) return/);
  assert.match(carousel, /current === preset\.id \? null : preset\.id/);
  assert.match(carousel, /onClick=\{handleCardClick\}/);
  assert.match(carousel, /desktopRevealClassName/);
  assert.match(carousel, /group-hover:pointer-events-auto/);
  assert.match(carousel, /group-focus-within:pointer-events-auto/);
  assert.match(carousel, /actionsAreOpen \? 'pointer-events-auto opacity-100'/);
  assert.match(carousel, /Toque para mostrar ou ocultar a ação de adicionar/);
  assert.match(carousel, /Adicionar modelo/);
  assert.match(carousel, /min-h-11/);
  assert.match(carousel, /focus-visible:ring-2/);
  assert.match(carousel, /aria-expanded=\{isActive && isTouchOnlyDevice/);
});

test('detecção de mobile usa capacidade de toque em vez da largura da tela', async () => {
  const hook = await read('src/features/design-pdf/hooks/useTouchOnlyDevice.ts');

  assert.match(hook, /\(hover: none\) and \(pointer: coarse\)/);
  assert.match(hook, /window\.matchMedia/);
  assert.match(hook, /addEventListener\('change'/);
  assert.match(hook, /removeEventListener\('change'/);
});

test('as três ilustrações passam pelo mesmo pipeline de cores e alta resolução', async () => {
  const engine = await read('src/lib/pdf/utils/illustrationColorEngine.ts');
  const sharedAssets = await read('src/lib/pdf/renderProposalDocument.tsx');
  const document = await read('src/components/pdf/ProposalDocument.tsx');
  const pdfPages = await read('src/components/pdf/sections/ProposalPagesWithVectorArt.tsx');

  assert.match(engine, /ILLUSTRATION_ORIGINAL_THEME/);
  assert.match(engine, /primary: '#0076DD'/);
  assert.match(engine, /accent: '#FACB5C'/);
  assert.match(engine, /neutral: '#000000'/);
  assert.match(engine, /removeConnectedWhiteBackground/);
  assert.match(engine, /findOpaqueBounds/);
  assert.match(engine, /renderHighResolutionIllustration/);
  assert.match(engine, /imageSmoothingQuality = 'high'/);
  assert.match(engine, /outputWidth: 2100/);
  assert.match(engine, /buildProposalIllustrationImages/);
  assert.match(sharedAssets, /resolvePdfDocumentTheme\(model\?\.theme\)/);
  assert.match(sharedAssets, /buildProposalIllustrationImages\(resolvedTheme\)/);
  assert.match(sharedAssets, /applyPdfThemeToIllustration/);
  assert.match(document, /illustration=\{illustrationImages\.kit\}/);
  assert.match(document, /illustration=\{illustrationImages\.timeline\}/);
  assert.match(document, /illustration=\{illustrationImages\.financial\}/);
  assert.match(pdfPages, /function ArtStage/);
  assert.match(pdfPages, /<ArtStage src=\{illustration\} height=\{360\} \/>/);
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

test('gerador usa o modelo selecionado e valida o PDF final', async () => {
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const app = await read('src/App.tsx');

  assert.match(generator, /resolvePdfModel\(enrichedProposal, selectedModelId\)/);
  assert.match(generator, /renderProposalPdfBlob\(enrichedProposal, selectedModel\)/);
  assert.match(generator, /minPages: 1/);
  assert.match(app, /path="design-pdf" element=\{<DesignPdf \/>\}/);
});
