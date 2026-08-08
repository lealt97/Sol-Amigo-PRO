import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Garante a geometria A4 e separa o layout do editor entre desktop, mobile em pé e mobile deitado.
const read = (path: string) => readFile(path, 'utf8');

test('a folha A4 preserva o desktop e o editor responde à orientação do mobile', async () => {
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
  assert.match(preview, /const MOBILE_LANDSCAPE_MAX_PREVIEW_SCALE = 0\.8/);
  assert.match(preview, /dataset\.designPdfDesktopViewport === 'true'/);
  assert.match(preview, /orientation: landscape/);
  assert.match(preview, /isMobileLandscape \? MOBILE_LANDSCAPE_MAX_PREVIEW_SCALE : 1/);
  assert.match(preview, /orientationQuery\.addEventListener\('change', syncPreviewScale\)/);
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

  // O editor detecta o dispositivo real e também a orientação física da tela.
  assert.match(editor, /function detectMobileOrTabletEditor\(\)/);
  assert.match(editor, /function shouldUseTopEditorLayout\(\)/);
  assert.match(editor, /matchMedia\('\(orientation: landscape\)'\)/);
  assert.match(editor, /const \[useTopEditorLayout, setUseTopEditorLayout\] = useState\(shouldUseTopEditorLayout\)/);
  assert.match(editor, /orientationQuery\.addEventListener\('change', syncEditorLayout\)/);
  assert.match(editor, /window\.addEventListener\('orientationchange', syncEditorLayout\)/);

  // Mobile em pé: painel superior confortável e PDF abaixo.
  assert.match(editor, /h-\[44dvh\] min-h-\[400px\] max-h-\[520px\]/);
  assert.match(editor, /mobile-portrait-fixed-top-preview/);
  assert.match(editor, /fixed-top/);

  // Desktop e mobile deitado: menu lateral à esquerda e PDF à direita.
  assert.match(editor, /grid-cols-\[420px_minmax\(0,1fr\)\]/);
  assert.match(editor, /sticky top-0 flex h-full min-h-0 w-\[420px\]/);
  assert.match(editor, /side-preview/);
  assert.match(editor, /data-design-pdf-controls=\{useTopEditorLayout \? 'fixed-top' : 'side'\}/);

  // As duas versões mantêm rolagem interna independente.
  assert.match(editor, /min-h-0 flex-1 overflow-y-auto overscroll-contain p-5/);
  assert.match(editor, /mobile-portrait-scroll-only/);
  assert.match(editor, /side-scroll-only/);
  assert.match(preview, /className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth py-6"/);
});
