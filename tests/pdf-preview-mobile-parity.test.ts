import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('a folha A4 mantém o layout desktop e apenas escala no mobile', async () => {
  const [preview, editor] = await Promise.all([
    read('src/features/design-pdf/components/PdfPreview.tsx'),
    read('src/features/design-pdf/components/DesignPdfEditor.tsx'),
  ]);

  assert.match(preview, /const A4_PREVIEW_WIDTH = 794/);
  assert.match(preview, /A4_PREVIEW_WIDTH \* \(297 \/ 210\)/);
  assert.match(preview, /new ResizeObserver\(syncPreviewScale\)/);
  assert.match(preview, /availableWidth \/ A4_PREVIEW_WIDTH/);
  assert.match(preview, /transform: `scale\(\$\{previewScale\}\)`/);
  assert.match(preview, /transformOrigin: 'top left'/);
  assert.match(preview, /width: A4_PREVIEW_WIDTH,/);
  assert.match(preview, /height: A4_PREVIEW_HEIGHT,/);
  assert.doesNotMatch(preview, /pdf-preview-page relative aspect-\[210\/297\] w-full/);

  assert.match(editor, /flex-col[\s\S]*lg:flex-row/);
  assert.match(editor, /h-\[46%\][\s\S]*lg:h-full[\s\S]*lg:w-\[420px\]/);
  assert.match(editor, /<main className="min-h-0 min-w-0 flex-1/);
});
