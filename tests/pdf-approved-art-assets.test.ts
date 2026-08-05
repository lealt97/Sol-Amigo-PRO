import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

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

test('os arquivos aprovados contêm imagens PNG transparentes incorporadas', async () => {
  const [timeline, savings] = await Promise.all([
    read('src/assets/pdf-art/approvedImplementationTimelineImage.ts'),
    read('src/assets/pdf-art/approvedAccumulatedSavingsImage.ts'),
  ]);

  assert.match(timeline, /data:image\/png;base64,iVBOR/);
  assert.match(savings, /data:image\/png;base64,iVBOR/);
});
