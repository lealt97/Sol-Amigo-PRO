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

test('preview e exportação usam as mesmas superfícies e a mesma faixa do documento PDF', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const pdfPages = await read('src/components/pdf/sections/ProposalPagesWithVectorArt.tsx');

  assert.match(preview, /renderProposalPdfBlob\(proposal, model\)/);
  assert.match(preview, /URL\.createObjectURL\(blob\)/);
  assert.doesNotMatch(preview, /previewParityCss/);
  assert.doesNotMatch(preview, /linear-gradient/);
  assert.doesNotMatch(preview, /function PreviewTopStripe/);
  assert.match(generator, /<ProposalDocument proposal=\{proposal\} \{\.\.\.documentAssets\} \/>/);
  assert.match(pdfPages, /backgroundColor: t\.primary/);
  assert.match(pdfPages, /backgroundColor: t\.secondary/);
  assert.match(pdfPages, /backgroundColor: t\.accent/);
});

test('preview não possui mais uma ilustração paralela antes do processamento temático', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');
  const assets = await read('src/lib/pdf/renderProposalDocument.tsx');

  assert.match(preview, /import\('\.\.\/\.\.\/\.\.\/lib\/pdf\/generateProposalPdf'\)/);
  assert.match(preview, /renderProposalPdfBlob\(proposal, model\)/);
  assert.doesNotMatch(preview, /TimelineTallPreview/);
  assert.doesNotMatch(preview, /ProposalPagesPreviewWithVectorArt/);
  assert.match(generator, /prepareProposalDocumentAssets\(\{ proposal, model \}\)/);
  assert.match(assets, /buildProposalIllustrationImages\(resolvedTheme\)/);
});
