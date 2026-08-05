import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('preto das ilustrações é fixo e somente a cor principal influencia a arte', async () => {
  const engine = await read('src/lib/pdf/utils/illustrationColorEngine.ts');

  assert.match(engine, /const FIXED_ILLUSTRATION_BLACK = '#000000'/);
  assert.match(engine, /const primaryTarget = hexToRgb\(theme\.primary\)/);
  assert.match(engine, /closest\.role === 'neutral'[\s\S]*fixedBlackTarget[\s\S]*mixRgb\(primaryTarget, WHITE_RGB/);
  assert.match(engine, /getPrimaryTintWeight/);
  assert.match(engine, /ILLUSTRATION_CACHE_VERSION/);
  assert.match(engine, /source,[\s\S]*theme\.primary,[\s\S]*options\.outputWidth,[\s\S]*options\.padding/);
  assert.doesNotMatch(engine, /theme\.secondary,[\s\S]*theme\.accent,[\s\S]*theme\.neutral,[\s\S]*options\.outputWidth/);
});

test('fundo claro é removido antes da recoloração e não contamina os limites da arte', async () => {
  const engine = await read('src/lib/pdf/utils/illustrationColorEngine.ts');

  assert.match(engine, /const BACKGROUND_MIN_CHANNEL = 224/);
  assert.match(engine, /const BACKGROUND_MAX_CHROMA = 40/);
  assert.match(engine, /function isLightBackgroundColor/);
  assert.match(engine, /const withoutBackground = removeConnectedWhiteBackground\(imageData\);[\s\S]*const themedImageData = recolorImageData\(withoutBackground, theme\);/);
  assert.match(engine, /alpha <= CONTENT_ALPHA_THRESHOLD/);
  assert.match(engine, /findOpaqueBounds\(themedImageData, resolvedOptions\.padding\)/);
});

test('preview ao vivo e exportação resolvem a mesma paleta sem bloquear a edição', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const pdfPages = await read('src/components/pdf/sections/ProposalPagesWithVectorArt.tsx');

  assert.match(preview, /resolvePdfDocumentTheme\(model\.theme\)/);
  assert.match(preview, /PreviewTopStripe/);
  assert.match(preview, /backgroundColor: theme\.primary/);
  assert.match(preview, /backgroundColor: theme\.secondary/);
  assert.match(preview, /backgroundColor: theme\.accent/);
  assert.match(preview, /ProposalPreviewPage/);
  assert.doesNotMatch(preview, /renderProposalPdfBlob/);
  assert.doesNotMatch(preview, /<iframe/);
  assert.match(generator, /<ProposalDocument[\s\S]*proposal=\{proposal\}[\s\S]*previewPageKey=\{previewPageKey\}/);
  assert.match(pdfPages, /backgroundColor: t\.primary/);
  assert.match(pdfPages, /backgroundColor: t\.secondary/);
  assert.match(pdfPages, /backgroundColor: t\.accent/);
});

test('preview ao vivo e PDF aplicam o mesmo motor às ilustrações', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const livePages = await read('src/features/design-pdf/components/ProposalPagesPreviewWithVectorArt.tsx');
  const liveTimeline = await read('src/features/design-pdf/components/TimelineTallPreview.tsx');
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const assets = await read('src/lib/pdf/renderProposalDocument.tsx');

  assert.match(preview, /ProposalPagesPreviewWithVectorArt/);
  assert.match(preview, /TimelineTallPreview/);
  assert.match(livePages, /applyPdfThemeToIllustration/);
  assert.match(livePages, /outputWidth=\{2100\}/);
  assert.match(liveTimeline, /TIMELINE_ILLUSTRATION_RENDER_OPTIONS/);
  assert.match(liveTimeline, /applyPdfThemeToIllustration/);
  assert.match(generator, /prepareProposalDocumentAssets\(\{[\s\S]*previewPageKey/);
  assert.match(assets, /prepareIllustrationsForPage/);
  assert.match(assets, /case 'intro'/);
  assert.match(assets, /case 'kit'/);
  assert.match(assets, /case 'timeline'/);
  assert.match(assets, /case 'financial'/);
  assert.match(assets, /case 'payback'/);
  assert.match(assets, /buildProposalIllustrationImages\(resolvedTheme\)/);
});
