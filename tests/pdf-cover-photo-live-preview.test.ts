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
  assert.match(preview, /setCoverImageDataUrl\(embedded\)/);
  assert.match(preview, /coverImageUrl: coverImageDataUrl/);
  assert.match(preview, /coverImageTransform: model\.cover_image_transform/);
  assert.doesNotMatch(preview, /setCoverImageUrl\(resolved\)/);

  assert.match(dataUrl, /const response = await fetch\(url\)/);
  assert.match(dataUrl, /const blob = await response\.blob\(\)/);
  assert.match(dataUrl, /new FileReader\(\)/);
  assert.match(dataUrl, /reader\.readAsDataURL\(blob\)/);
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

  assert.match(preview, /\}, \[model\.cover_image_url\]\);/);
  assert.match(preview, /\[svgSource, preset, model, profileLogo, coverImageDataUrl\]/);
  assert.doesNotMatch(preview, /Atualizando\.\.\./);
  assert.doesNotMatch(preview, /<iframe/);
});
