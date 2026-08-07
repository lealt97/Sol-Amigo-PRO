import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Garante que o Design PDF use a mesma geometria de desktop também em dispositivos móveis.
const read = (path: string) => readFile(path, 'utf8');

test('a folha A4 e o editor preservam o layout desktop no mobile', async () => {
  const [preview, editor, designPage, indexHtml] = await Promise.all([
    read('src/features/design-pdf/components/PdfPreview.tsx'),
    read('src/features/design-pdf/components/DesignPdfEditor.tsx'),
    read('src/features/design-pdf/pages/DesignPdfPage.tsx'),
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

  // Em celular/tablet, a rota do Design PDF adota uma largura virtual de desktop.
  assert.match(designPage, /const DESIGN_PDF_DESKTOP_VIEWPORT_WIDTH = 1280/);
  assert.match(designPage, /navigator\.maxTouchPoints > 0/);
  assert.match(designPage, /matchMedia\('\(pointer: coarse\)'\)/);
  assert.match(designPage, /viewportMeta\.setAttribute\('content', `width=\$\{DESIGN_PDF_DESKTOP_VIEWPORT_WIDTH\}`\)/);
  assert.match(designPage, /viewportMeta\.setAttribute\('content', originalContent\)/);
  assert.match(designPage, /useDesktopViewportOnMobile\(\)/);

  // O restante do SaaS continua com viewport responsivo normal e zoom disponível.
  assert.match(indexHtml, /width=device-width, initial-scale=1\.0/);
  assert.doesNotMatch(indexHtml, /maximum-scale=1/);
  assert.doesNotMatch(indexHtml, /user-scalable=no/);

  // O painel de edição fica fixo acima da janela do PDF; a prévia rola separadamente abaixo.
  assert.match(editor, /flex h-\[calc\(100dvh-96px\)\] min-h-0 flex-col overflow-hidden/);
  assert.match(editor, /data-design-pdf-editor="fixed-top-preview"/);
  assert.match(editor, /h-\[44dvh\] min-h-\[400px\] max-h-\[520px\] shrink-0 flex-col overflow-hidden border-b/);
  assert.match(editor, /data-design-pdf-controls="fixed-top"/);
  assert.match(editor, /min-h-0 flex-1 overflow-y-auto overscroll-contain p-5/);
  assert.match(editor, /data-design-pdf-preview-window="scroll-only"/);
  assert.doesNotMatch(editor, /grid-cols-\[420px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(editor, /w-\[420px\]/);

  assert.match(preview, /className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth py-6"/);
});
