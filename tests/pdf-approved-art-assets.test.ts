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
  partPaths: [string, string],
) {
  const [wrapper, firstPart, secondPart] = await Promise.all([
    read(wrapperPath),
    read(partPaths[0]),
    read(partPaths[1]),
  ]);

  for (const source of [wrapper, firstPart, secondPart]) {
    assert.doesNotMatch(source, /ELLIPSIZATION/);
  }

  assert.match(wrapper, new RegExp(partPaths[0].split('/').at(-1)!.replace('.ts', '')));
  assert.match(wrapper, new RegExp(partPaths[1].split('/').at(-1)!.replace('.ts', '')));

  const image = Buffer.from(
    extractBase64Part(firstPart) + extractBase64Part(secondPart),
    'base64',
  );

  assert.deepEqual(
    [...image.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.ok(image.length > 5_000, 'A imagem reconstruída parece estar incompleta.');
}

test('as artes aprovadas são usadas no PDF e na prévia', async () => {
  const [timeline, timelineNew, savings, financial] = await Promise.all([
    read('src/assets/pdf-art/implementationTimelineImage.ts'),
    read('src/assets/pdf-art/implementationTimelineNewImage.ts'),
    read('src/assets/pdf-art/accumulatedSavingsImage.ts'),
    read('src/assets/pdf-art/financialReturnImage.ts'),
  ]);

  assert.match(timeline, /approvedImplementationTimelineImage/);
  assert.match(timelineNew, /approvedImplementationTimelineImage/);
  assert.match(savings, /approvedAccumulatedSavingsImage/);
  assert.match(financial, /approvedAccumulatedSavingsImage/);
});

test('a arte de implantação forma um PNG válido sem conteúdo truncado', async () => {
  await assertValidPngParts(
    'src/assets/pdf-art/approvedImplementationTimelineImage.ts',
    [
      'src/assets/pdf-art/approvedImplementationTimelineSmallPart0.ts',
      'src/assets/pdf-art/approvedImplementationTimelineSmallPart1.ts',
    ],
  );
});

test('a arte de economia forma um PNG válido sem conteúdo truncado', async () => {
  await assertValidPngParts(
    'src/assets/pdf-art/approvedAccumulatedSavingsImage.ts',
    [
      'src/assets/pdf-art/approvedAccumulatedSavingsSmallPart0.ts',
      'src/assets/pdf-art/approvedAccumulatedSavingsSmallPart1.ts',
    ],
  );
});
