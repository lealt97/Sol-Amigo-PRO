import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('foto privada da capa é incorporada antes de entrar no SVG do preview ao vivo', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const dataUrl = await read('src/lib/images/urlToDataUrl.ts');

  assert.match(preview, /import \{ urlToDataUrl \} from '\.\.\/\.\.\/\.\.\/lib\/images\/urlToDataUrl'/);
  assert.match(preview, /resolveAssetUrl\(model\.cover_image_url, 900\)/);
  assert.match(preview, /const embedded = await urlToDataUrl\(resolved\)/);
  assert.match(preview, /setResolvedCoverImageDataUrl\(embedded\)/);
  assert.match(preview, /coverImageUrl: effectiveCoverImageDataUrl/);
  assert.match(preview, /coverImageTransform: model\.cover_image_transform/);
  assert.doesNotMatch(preview, /setCoverImageUrl\(resolved\)/);

  assert.match(dataUrl, /const response = await fetch\(url\)/);
  assert.match(dataUrl, /return blobToImageDataUrl\(await response\.blob\(\)\)/);
  assert.match(dataUrl, /new FileReader\(\)/);
});

test('mime genérico do storage é corrigido pelos bytes reais da foto', async () => {
  const dataUrl = await read('src/lib/images/urlToDataUrl.ts');

  assert.match(dataUrl, /function detectImageMimeType/);
  assert.match(dataUrl, /return 'image\/png'/);
  assert.match(dataUrl, /return 'image\/jpeg'/);
  assert.match(dataUrl, /return 'image\/webp'/);
  assert.match(dataUrl, /new Blob\(\[await blob\.arrayBuffer\(\)\], \{ type: mimeType \}\)/);
  assert.match(dataUrl, /result\?\.startsWith\('data:image\/'\)/);
  assert.match(dataUrl, /asset_unsupported_image_type/);
});

test('arquivo local aparece na capa antes de depender da url assinada', async () => {
  const editor = await read('src/features/design-pdf/components/DesignPdfEditor.tsx');
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(editor, /import \{ blobToImageDataUrl \} from '\.\.\/\.\.\/\.\.\/lib\/images\/urlToDataUrl'/);
  assert.match(editor, /const localDataUrl = await blobToImageDataUrl\(file\)/);
  assert.match(editor, /setLiveCoverImageDataUrl\(localDataUrl\)/);
  assert.match(editor, /coverImageDataUrl=\{liveCoverImageDataUrl\}/);
  assert.match(preview, /coverImageDataUrl\?: string \| null/);
  assert.match(preview, /coverImageDataUrlOverride !== undefined/);
  assert.match(preview, /effectiveCoverImageDataUrl/);
});

test('preview e exportação compartilham a mesma conversão segura da foto', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');
  const exporter = await read('src/lib/pdf/utils/svgToImage.ts');

  assert.match(preview, /urlToDataUrl\(resolved\)/);
  assert.match(exporter, /import \{ urlToDataUrl \} from '\.\.\/\.\.\/images\/urlToDataUrl'/);
  assert.match(exporter, /const coverImageUrl = await safeUrlToDataUrl\(privateCoverUrl\)/);
  assert.match(exporter, /coverImageUrl,/);
});

test('enquadramento continua reagindo ao estado sem recarregar a imagem privada', async () => {
  const preview = await read('src/features/design-pdf/components/PdfPreview.tsx');

  assert.match(preview, /\}, \[coverImageDataUrlOverride, model\.cover_image_url\]\);/);
  assert.match(preview, /\[svgSource, preset, model, profileLogo, effectiveCoverImageDataUrl\]/);
  assert.doesNotMatch(preview, /Atualizando\.\.\./);
  assert.doesNotMatch(preview, /<iframe/);
});
