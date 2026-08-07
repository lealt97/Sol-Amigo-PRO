import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Garante que o Design PDF use a mesma geometria de desktop também em dispositivos móveis.
const read = (path: string) => readFile(path, 'utf8');

test('a folha A4, o editor e a navegação preservam o layout desktop no mobile', async () => {
  const [preview, editor, designPage, layout, indexHtml] = await Promise.all([
    read('src/features/design-pdf/components/PdfPreview.tsx'),
    read('src/features/design-pdf/components/DesignPdfEditor.tsx'),
    read('src/features/design-pdf/pages/DesignPdfPage.tsx'),
    read('src/components/Layout.tsx'),
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

  // A navegação lateral abre expandida nessa rota, igual ao desktop, mas ainda pode ser recolhida manualmente.
  assert.match(layout, /function isTouchMobileOrTablet\(\)/);
  assert.match(layout, /location\.pathname\.startsWith\('\/design-pdf'\)/);
  assert.match(layout, /setIsSidebarExpanded\(true\)/);
  assert.match(layout, /isSidebarExpanded \? "w-64" : "w-20"/);
  assert.match(layout, /format=\{isSidebarExpanded \? 'horizontal' : 'icon'\}/);
  assert.match(layout, /onClick=\{\(\) => setIsSidebarExpanded\(!isSidebarExpanded\)\}/);

  // O restante do SaaS continua com viewport responsivo normal e zoom disponível.
  assert.match(indexHtml, /width=device-width, initial-scale=1\.0/);
  assert.doesNotMatch(indexHtml, /maximum-scale=1/);
  assert.doesNotMatch(indexHtml, /user-scalable=no/);

  // O menu do PDF fica sempre em uma coluna fixa à esquerda da prévia, sem empilhar no mobile.
  assert.match(editor, /flex min-h-0 flex-row overflow-hidden/);
  assert.match(editor, /flex h-full w-\[420px\] shrink-0 flex-col border-r/);
  assert.doesNotMatch(editor, /flex-col[\s\S]*lg:flex-row/);
  assert.doesNotMatch(editor, /h-\[46%\]/);
  assert.match(editor, /<main className="min-h-0 min-w-0 flex-1/);
});
