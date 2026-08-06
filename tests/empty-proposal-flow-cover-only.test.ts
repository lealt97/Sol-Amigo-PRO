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
  assert.match(document, /illustration=\{illustrationImages\.intro\}/);
  assert.match(document, /illustration=\{illustrationImages\.kit\}/);
  assert.match(document, /illustration=\{illustrationImages\.timeline\}/);
  assert.match(document, /illustration=\{illustrationImages\.financial\}/);
});

test('editor usa preview ao vivo e mantém a geração exata apenas na exportação', async () => {
  const editor = await read('src/features/design-pdf/components/PageConfigEditor.tsx');
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const designEditor = await read('src/features/design-pdf/components/DesignPdfEditor.tsx');

  assert.match(editor, /onNavigate\?\.\(page\.key\)/);
  assert.match(editor, /page\.key === 'cover'/);
  assert.match(preview, /resolvePdfDocumentTheme/);
  assert.match(preview, /buildSvgTemplate/);
  assert.match(preview, /ProposalPreviewPage/);
  assert.match(preview, /TimelineTallPreview/);
  assert.match(preview, /visiblePages\.map/);
  assert.match(preview, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(preview, /renderProposalPdfBlob/);
  assert.doesNotMatch(preview, /<iframe/);
  assert.doesNotMatch(preview, /Atualizando\.\.\./);
  assert.match(designEditor, /previewRef\.current\?\.scrollToPage\(pageKey\)/);
});

test('preview reflete a edição no mesmo render sem debounce ou fila de PDF', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(preview, /const previewTheme = useMemo\(\(\) => resolvePdfDocumentTheme\(model\.theme\)/);
  assert.match(preview, /current: model\.theme/);
  assert.match(preview, /logoTransform: model\.logo_transform/);
  assert.match(preview, /coverImageTransform: model\.cover_image_transform/);
  assert.match(preview, /style=\{\{ backgroundColor: theme\.primary \}\}/);
  assert.doesNotMatch(preview, /window\.setTimeout/);
  assert.doesNotMatch(preview, /window\.requestAnimationFrame/);
  assert.doesNotMatch(preview, /latestRequestRef/);
  assert.doesNotMatch(preview, /renderingRef/);
  assert.doesNotMatch(preview, /Gerando a visualização exata/);
});

test('exportação continua usando o documento oficial e o preview não gera blobs durante a edição', async () => {
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
  assert.doesNotMatch(preview, /generateProposalPdf/);
  assert.doesNotMatch(preview, /URL\.createObjectURL/);
});

test('nome do modelo não participa da composição visual do preview', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(preview, /model\.preset_id/);
  assert.match(preview, /model\.theme/);
  assert.match(preview, /model\.page_config/);
  assert.doesNotMatch(preview, /model\.name/);
});

test('ações dos modelos permanecem acessíveis e clicáveis no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/UserModelCarousel.tsx');

  assert.match(carousel, /const activeModel = userModels\[activeIndex\] \?\? userModels\[0\]/);
  assert.match(carousel, /isTouchOnlyDevice \? 'grid' : 'grid md:hidden'/);
  assert.match(carousel, /desktopActionsClassName/);
  assert.match(carousel, /isTouchOnlyDevice \? 'hidden' : 'hidden md:flex'/);
  assert.match(carousel, /touch-manipulation/);
  assert.match(carousel, /min-h-12/);
  assert.match(carousel, />\s*Editar\s*</);
  assert.match(carousel, />\s*Duplicar\s*</);
  assert.match(carousel, />\s*Tornar padrão\s*</);
  assert.match(carousel, />\s*Excluir\s*</);
  assert.match(carousel, /Use os botões de ação abaixo da prévia/);
  assert.doesNotMatch(carousel, /aria-expanded/);
});

test('adicionar modelo padrão permanece acessível e clicável no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/TemplateCarousel.tsx');

  assert.match(carousel, /const activePreset = presets\[activeIndex\] \?\? presets\[0\]/);
  assert.match(carousel, /isTouchOnlyDevice \? 'flex' : 'flex md:hidden'/);
  assert.match(carousel, /desktopActionsClassName/);
  assert.match(carousel, /isTouchOnlyDevice \? 'hidden' : 'hidden md:flex'/);
  assert.match(carousel, /touch-manipulation/);
  assert.match(carousel, /min-h-12/);
  assert.match(carousel, /onAddFromPreset\(activePreset\.id\)/);
  assert.match(carousel, /Use o botão Adicionar modelo abaixo da prévia/);
  assert.doesNotMatch(carousel, /aria-expanded/);
});

test('detecção de toque cobre celulares, tablets e dispositivos híbridos', async () => {
  const hook = await read('src/features/design-pdf/hooks/useTouchOnlyDevice.ts');

  assert.match(hook, /navigator\.maxTouchPoints > 0/);
  assert.match(hook, /'ontouchstart' in window/);
  assert.match(hook, /\(hover: none\)/);
  assert.match(hook, /\(pointer: coarse\)/);
  assert.match(hook, /\(any-pointer: coarse\)/);
  assert.match(hook, /addEventListener\('change'/);
  assert.match(hook, /removeEventListener\('change'/);
  assert.match(hook, /addListener\(syncDeviceCapability\)/);
  assert.match(hook, /removeListener\(syncDeviceCapability\)/);
});

test('as quatro ilustrações passam pelo mesmo pipeline de cores e alta resolução', async () => {
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
