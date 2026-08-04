import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('página de etapas reserva uma área vertical alta e não corta a ilustração', async () => {
  const page = await read('src/components/pdf/sections/TimelineTallPage.tsx');
  const document = await read('src/components/pdf/ProposalDocument.tsx');

  assert.match(page, /artColumn:[\s\S]*width: '61%'[\s\S]*height: 592/);
  assert.match(page, /artImage:[\s\S]*width: '100%'[\s\S]*height: '100%'[\s\S]*objectFit: 'contain'/);
  assert.match(page, /timelineColumn:[\s\S]*width: '35%'[\s\S]*height: 592/);
  assert.match(page, /Um processo organizado, transparente e acompanhado/);
  assert.match(document, /import \{ TimelineTallPage \} from '\.\/sections\/TimelineTallPage'/);
  assert.match(document, /<TimelineTallPage/);
  assert.doesNotMatch(document, /<TimelinePage/);
});

test('preview ao vivo e PDF usam o mesmo motor e as mesmas opções da arte vertical', async () => {
  const engine = await read('src/lib/pdf/utils/illustrationColorEngine.ts');
  const assets = await read('src/lib/pdf/renderProposalDocument.tsx');
  const document = await read('src/components/pdf/ProposalDocument.tsx');
  const pdfPreview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const timelinePreview = await read('src/features/design-pdf/components/TimelineTallPreview.tsx');
  const generator = await read('src/lib/pdf/generateProposalPdf.tsx');

  assert.match(engine, /TIMELINE_ILLUSTRATION_RENDER_OPTIONS:[\s\S]*outputWidth: 2100[\s\S]*padding: 24/);
  assert.match(engine, /implementationTimelineImage,[\s\S]*theme,[\s\S]*TIMELINE_ILLUSTRATION_RENDER_OPTIONS/);
  assert.match(assets, /case 'timeline':[\s\S]*TIMELINE_ILLUSTRATION_RENDER_OPTIONS/);
  assert.match(document, /<TimelineTallPage[\s\S]*illustration=\{illustrationImages\.timeline\}/);
  assert.match(pdfPreview, /TimelineTallPreview/);
  assert.match(timelinePreview, /TIMELINE_ILLUSTRATION_RENDER_OPTIONS/);
  assert.match(timelinePreview, /grid-cols-\[1\.28fr_\.72fr\]/);
  assert.match(generator, /<ProposalDocument[\s\S]*previewPageKey=\{previewPageKey\}/);
});
