from pathlib import Path
import re

repo = Path('.')

pdf_path = repo / 'src/features/design-pdf/components/PdfPreview.tsx'
pdf = pdf_path.read_text(encoding='utf-8')

marker = '\nfunction PreviewTopStripe'
constants = '''
const A4_PREVIEW_WIDTH = 794;
const A4_PREVIEW_HEIGHT = A4_PREVIEW_WIDTH * (297 / 210);
const MIN_PREVIEW_SCALE = 0.1;

function PreviewTopStripe'''
if marker not in pdf:
    raise SystemExit('Ponto para constantes A4 não encontrado em PdfPreview.')
pdf = pdf.replace(marker, constants, 1)

old_refs = '''  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Partial<Record<ProposalPageKey, HTMLDivElement | null>>>({});'''
new_refs = '''  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Partial<Record<ProposalPageKey, HTMLDivElement | null>>>({});
  const [previewScale, setPreviewScale] = useState(1);'''
if old_refs not in pdf:
    raise SystemExit('Refs da prévia não encontradas.')
pdf = pdf.replace(old_refs, new_refs, 1)

scroll_marker = '''  const scrollToPage = useCallback((pageKey: ProposalPageKey) => {'''
scale_effect = '''  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport) return undefined;

    const syncPreviewScale = () => {
      const availableWidth = viewport.clientWidth;
      if (availableWidth <= 0) return;

      const nextScale = Math.min(1, Math.max(MIN_PREVIEW_SCALE, availableWidth / A4_PREVIEW_WIDTH));
      setPreviewScale((currentScale) => (
        Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale
      ));
    };

    syncPreviewScale();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(syncPreviewScale)
      : null;
    resizeObserver?.observe(viewport);
    window.addEventListener('resize', syncPreviewScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncPreviewScale);
    };
  }, []);

  const scrollToPage = useCallback((pageKey: ProposalPageKey) => {'''
if scroll_marker not in pdf:
    raise SystemExit('scrollToPage não encontrado.')
pdf = pdf.replace(scroll_marker, scale_effect, 1)

return_pattern = re.compile(
    r'''      <div\n        ref=\{scrollContainerRef\}[\s\S]*?      </div>\n    </>'''
)
new_return = '''      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth py-6"
      >
        <div className="mx-auto w-full px-3 sm:px-5">
          <div ref={previewViewportRef} className="mx-auto w-full">
            <div
              className="mx-auto flex flex-col gap-7 pb-12"
              style={{ width: A4_PREVIEW_WIDTH * previewScale }}
              data-pdf-preview-scale={previewScale.toFixed(4)}
            >
              {visiblePages.map((page, index) => (
                <div
                  key={page.key}
                  ref={(node) => {
                    pageRefs.current[page.key] = node;
                  }}
                  data-pdf-page={page.key}
                  className="relative shrink-0"
                  style={{
                    width: A4_PREVIEW_WIDTH * previewScale,
                    height: A4_PREVIEW_HEIGHT * previewScale,
                  }}
                >
                  <div
                    className="pdf-preview-page relative shrink-0 overflow-hidden border border-brand-border bg-white shadow-2xl"
                    style={{
                      width: A4_PREVIEW_WIDTH,
                      height: A4_PREVIEW_HEIGHT,
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                      '--pdf-preview-surface': previewTheme.surface,
                    } as CSSProperties}
                  >
                    {page.key !== 'cover' && <PreviewTopStripe theme={previewTheme} />}
                    {page.key === 'cover' ? (
                      <div
                        className="flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
                      />
                    ) : page.key === 'timeline' ? (
                      <TimelineTallPreview
                        pageNumber={index + 1}
                        theme={previewTheme}
                      />
                    ) : (
                      <ProposalPreviewPage
                        pageKey={page.key}
                        pageNumber={index + 1}
                        theme={previewTheme}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>'''
pdf, count = return_pattern.subn(new_return, pdf, count=1)
if count != 1:
    raise SystemExit(f'Bloco principal da prévia não substituído: {count}')

pdf_path.write_text(pdf, encoding='utf-8')

editor_path = repo / 'src/features/design-pdf/components/DesignPdfEditor.tsx'
editor = editor_path.read_text(encoding='utf-8')

old_shell = '    <div className="h-[calc(100vh-96px)] -m-6 flex bg-slate-950 overflow-hidden">'
new_shell = '    <div className="h-[calc(100dvh-96px)] -m-6 flex min-h-0 flex-col overflow-hidden bg-slate-950 lg:flex-row">'
if old_shell not in editor:
    raise SystemExit('Contêiner principal do editor não encontrado.')
editor = editor.replace(old_shell, new_shell, 1)

old_aside = '      <aside className="w-[420px] shrink-0 border-r border-brand-border bg-brand-surface/95 flex flex-col">'
new_aside = '      <aside className="flex h-[46%] w-full shrink-0 flex-col border-b border-brand-border bg-brand-surface/95 lg:h-full lg:w-[420px] lg:border-b-0 lg:border-r">'
if old_aside not in editor:
    raise SystemExit('Painel lateral do editor não encontrado.')
editor = editor.replace(old_aside, new_aside, 1)

old_main = '      <main className="flex-1 min-w-0 bg-slate-900/80">'
new_main = '      <main className="min-h-0 min-w-0 flex-1 bg-slate-900/80">'
if old_main not in editor:
    raise SystemExit('Área da prévia do editor não encontrada.')
editor = editor.replace(old_main, new_main, 1)

editor_path.write_text(editor, encoding='utf-8')

test_path = repo / 'tests/pdf-preview-mobile-parity.test.ts'
test_path.write_text('''import assert from 'node:assert/strict';
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
''', encoding='utf-8')
