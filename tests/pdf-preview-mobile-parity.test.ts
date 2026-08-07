import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Garante que a resolução do dispositivo nunca reorganize nem infle a tipografia da folha A4.
const read = (path: string) => readFile(path, 'utf8');

test('a folha A4 mantém o layout desktop e apenas escala no mobile', async () => {
  const [preview, editor, indexHtml] = await Promise.all([
    read('src/features/design-pdf/components/PdfPreview.tsx'),
    read('src/features/design-pdf/components/DesignPdfEditor.tsx'),
    read('index.html'),
  ]);

  assert.match(preview, /const A4_PREVIEW_WIDTH = 794/);
  assert.match(preview, /A4_PREVIEW_WIDTH \* \(297 \/ 210\)/);
  assert.match(preview, /new ResizeObserver\(syncPreviewScale\)/);
  assert.match(preview, /availableWidth \/ A4_PREVIEW_WIDTH/);
  assert.match(preview, /transform: `scale\(\$\{previewScale\}\)`/);
  assert.match(preview, /transformOrigin: 'top left'/);
  assert.match(preview, /width: A4_PREVIEW_WIDTH,/);
  assert.match(preview, /height: A4_PREVIEW_HEIGHT,/);
  assert.match(preview, /-webkit-text-size-adjust: none !important/);
  assert.match(preview, /text-size-adjust: none !important/);
  assert.doesNotMatch(preview, /pdf-preview-page relative aspect-\[210\/297\] w-full/);

  // Mantém zoom do navegador disponível; a fidelidade é resolvida dentro do PDF, não bloqueando acessibilidade global.
  assert.match(indexHtml, /width=device-width, initial-scale=1\.0/);
  assert.doesNotMatch(indexHtml, /maximum-scale=1/);
  assert.doesNotMatch(indexHtml, /user-scalable=no/);

  assert.match(editor, /flex-col[\s\S]*lg:flex-row/);
  assert.match(editor, /h-\[46%\][\s\S]*lg:h-full[\s\S]*lg:w-\[420px\]/);
  assert.match(editor, /<main className="min-h-0 min-w-0 flex-1/);
});
