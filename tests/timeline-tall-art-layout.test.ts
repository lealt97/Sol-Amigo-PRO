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

test('preview da página de etapas respeita a altura da arte e adiciona margem segura', async () => {
  const preview = await read('src/features/design-pdf/components/TimelineTallPreview.tsx');
  const pdfPreview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(preview, /outputWidth: 2100/);
  assert.match(preview, /padding: 56/);
  assert.match(preview, /grid-cols-\[1\.28fr_\.72fr\]/);
  assert.match(preview, /max-h-full max-w-full object-contain object-center/);
  assert.match(preview, /Etapas do projeto fotovoltaico/);
  assert.match(pdfPreview, /page\.key === 'timeline'/);
  assert.match(pdfPreview, /<TimelineTallPreview/);
});
