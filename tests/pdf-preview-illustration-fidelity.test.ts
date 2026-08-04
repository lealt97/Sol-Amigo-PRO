import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('preto das ilustrações é fixo e somente a cor principal influencia a arte', async () => {
  const engine = await read('src/lib/pdf/utils/illustrationColorEngine.ts');

  assert.match(engine, /const FIXED_ILLUSTRATION_BLACK = '#000000'/);
  assert.match(engine, /const primaryTarget = hexToRgb\(theme\.primary\)/);
  assert.match(engine, /entry\.role === 'neutral' \? fixedBlackTarget : primaryTarget/);
  assert.match(engine, /source,[\s\S]*theme\.primary,[\s\S]*options\.outputWidth,[\s\S]*options\.padding/);
  assert.doesNotMatch(engine, /theme\.secondary,[\s\S]*theme\.accent,[\s\S]*theme\.neutral,[\s\S]*options\.outputWidth/);
});

test('preview substitui gradientes por superfícies e faixa sólida iguais ao PDF', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const pdfPages = await read('src/components/pdf/sections/ProposalPagesWithVectorArt.tsx');

  assert.match(preview, /previewParityCss/);
  assert.match(preview, /linear-gradient\(90deg/);
  assert.match(preview, /background: transparent !important/);
  assert.match(preview, /linear-gradient\(145deg/);
  assert.match(preview, /background: var\(--pdf-preview-surface\) !important/);
  assert.match(preview, /function PreviewTopStripe/);
  assert.match(preview, /backgroundColor: theme\.primary/);
  assert.match(preview, /backgroundColor: theme\.secondary/);
  assert.match(preview, /backgroundColor: theme\.accent/);
  assert.match(pdfPages, /backgroundColor: t\.primary/);
  assert.match(pdfPages, /backgroundColor: t\.secondary/);
  assert.match(pdfPages, /backgroundColor: t\.accent/);
});

test('preview não exibe a arte original antes do processamento temático', async () => {
  const timelinePreview = await read('src/features/design-pdf/components/TimelineTallPreview.tsx');

  assert.match(timelinePreview, /useState<string \| null>\(null\)/);
  assert.match(timelinePreview, /setSource\(null\)/);
  assert.match(timelinePreview, /aria-busy=\{!illustration\}/);
  assert.match(timelinePreview, /illustration \? \(/);
});
