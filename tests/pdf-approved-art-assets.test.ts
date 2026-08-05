import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

function extractBase64Part(source: string) {
  const match = source.match(/export default '([^']+)'/);
  assert.ok(match, 'A parte da imagem precisa exportar uma string Base64.');
  return match[1];
}

async function assertValidPngParts(
  wrapperPath: string,
  partPaths: string[],
  expectedWidth: number,
  expectedHeight: number,
) {
  const [wrapper, ...parts] = await Promise.all([
    read(wrapperPath),
    ...partPaths.map(read),
  ]);

  for (const source of [wrapper, ...parts]) {
    assert.doesNotMatch(source, /ELLIPSIZATION/);
  }

  for (const partPath of partPaths) {
    const segments = partPath.split('/');
    const moduleName = segments[segments.length - 1].replace(/\.ts$/, '');
    assert.match(wrapper, new RegExp(moduleName));
  }

  const image = Buffer.from(parts.map(extractBase64Part).join(''), 'base64');

  assert.deepEqual(
    [...image.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.equal(image.readUInt32BE(16), expectedWidth);
  assert.equal(image.readUInt32BE(20), expectedHeight);
  assert.equal(image.subarray(-8, -4).toString('ascii'), 'IEND');
  assert.ok(image.length > 5_000, 'A imagem reconstruída parece estar incompleta.');
}

test('cada página usa a arte correta no PDF e na prévia', async () => {
  const [timeline, timelineNew, savings, financial] = await Promise.all([
    read('src/assets/pdf-art/implementationTimelineImage.ts'),
    read('src/assets/pdf-art/implementationTimelineNewImage.ts'),
    read('src/assets/pdf-art/accumulatedSavingsImage.ts'),
    read('src/assets/pdf-art/financialReturnImage.ts'),
  ]);

  assert.match(timeline, /approvedImplementationTimelineImage/);
  assert.match(timelineNew, /approvedImplementationTimelineImage/);
  assert.match(savings, /approvedAccumulatedSavingsImage/);
  assert.match(financial, /financialReturnPart0/);
  assert.doesNotMatch(financial, /approvedAccumulatedSavingsImage/);
});

test('as páginas 04 e 05 não compartilham a mesma arte na prévia nem no PDF', async () => {
  const [preview, document] = await Promise.all([
    read('src/features/design-pdf/components/ProposalPagesPreviewWithVectorArt.tsx'),
    read('src/components/pdf/ProposalDocument.tsx'),
  ]);

  assert.match(preview, /import accumulatedSavingsImage from/);
  assert.match(preview, /import financialReturnImage from/);

  const financialPreview = preview.match(/function FinancialPreview[\s\S]*?function PaybackPreview/)?.[0];
  const paybackPreview = preview.match(/function PaybackPreview[\s\S]*?export function ProposalPreviewPage/)?.[0];

  assert.ok(financialPreview, 'A prévia financeira precisa existir.');
  assert.ok(paybackPreview, 'A prévia de payback precisa existir.');
  assert.match(financialPreview, /source=\{financialReturnImage\}/);
  assert.doesNotMatch(financialPreview, /source=\{accumulatedSavingsImage\}/);
  assert.match(paybackPreview, /source=\{accumulatedSavingsImage\}/);
  assert.doesNotMatch(paybackPreview, /source=\{financialReturnImage\}/);

  assert.match(document, /case 'financial':[\s\S]*?illustration=\{illustrationImages\.financial\}/);
  assert.match(document, /case 'payback':[\s\S]*?illustration=\{accumulatedSavingsImage\}/);
});

test('a página financeira usa layout vertical para ampliar a arte', async () => {
  const [preview, pdf] = await Promise.all([
    read('src/features/design-pdf/components/ProposalPagesPreviewWithVectorArt.tsx'),
    read('src/components/pdf/sections/ProposalPagesWithVectorArt.tsx'),
  ]);

  const financialPreview = preview.match(/function FinancialPreview[\s\S]*?function PaybackPreview/)?.[0];
  const financialPdf = pdf.match(/export function FinancialPage[\s\S]*?export function PaybackPage/)?.[0];

  assert.ok(financialPreview, 'A prévia financeira precisa existir.');
  assert.ok(financialPdf, 'A página financeira do PDF precisa existir.');
  assert.match(financialPreview, /grid h-\[23%\].*grid-cols-\[1\.35fr_\.78fr_\.78fr\]/);
  assert.match(financialPreview, /className="min-h-0 flex-1"/);
  assert.doesNotMatch(financialPreview, /grid-cols-\[\.82fr_1\.18fr\]/);
  assert.match(financialPdf, /<ArtStage src=\{illustration\} height=\{342\} \/>/);
  assert.doesNotMatch(financialPdf, /width: '58%'/);
});

test('a arte de implantação forma um PNG válido sem conteúdo truncado', async () => {
  await assertValidPngParts(
    'src/assets/pdf-art/approvedImplementationTimelineImage.ts',
    [
      'src/assets/pdf-art/approvedImplementationTimelineSmallPart0.ts',
      'src/assets/pdf-art/approvedImplementationTimelineSmallPart1.ts',
    ],
    320,
    491,
  );
});

test('a arte de economia forma um PNG válido sem conteúdo truncado', async () => {
  await assertValidPngParts(
    'src/assets/pdf-art/approvedAccumulatedSavingsImage.ts',
    [
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart0.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart1.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart2.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart3.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart4.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart5.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart6.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsExactPart7.ts',
    ],
    320,
    224,
  );
});
