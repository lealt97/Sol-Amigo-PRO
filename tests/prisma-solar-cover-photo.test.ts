import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('A4 12 usa o pattern apenas dentro da máscara e exige uma camada visível própria', async () => {
  const svg = await read('public/pdf-assets/covers/A4 -12.svg');

  assert.match(svg, /id="A4 - 12"/);
  assert.match(svg, /<mask id="mask0_326_18"/);
  assert.match(svg, /<path id="Vector 28"[^>]*fill="url\(#pattern0_326_18\)"/);
  assert.match(svg, /<g mask="url\(#mask0_326_18\)">[\s\S]*id="foto_aqui_icon"/);
  assert.doesNotMatch(svg, /id="cover-photo-layer"/);
});

test('motor converte exclusivamente a máscara da Prisma Solar em clipPath visível', async () => {
  const engine = await read('src/features/design-pdf/engines/photoEngine.ts');

  assert.match(engine, /PRISMA_SOLAR_COVER_SELECTOR = '\[id="A4 - 12"\], \[id="capa_12"\]'/);
  assert.match(engine, /PRISMA_SOLAR_MASK_ID = 'mask0_326_18'/);
  assert.match(engine, /PRISMA_SOLAR_CLIP_ID = 'cover-photo-clip-prisma-solar'/);
  assert.match(engine, /function ensurePrismaSolarPhotoLayer/);
  assert.match(engine, /const sourceShape = mask\?\.querySelector\('path'\)/);
  assert.match(engine, /clipShape\.removeAttribute\('fill'\)/);
  assert.match(engine, /clipPath\.setAttribute\('clipPathUnits', 'userSpaceOnUse'\)/);
  assert.match(engine, /coverGroup\.setAttribute\('data-photo-bounds', readMaskBounds\(mask\)\)/);
  assert.match(engine, /layer\.setAttribute\('clip-path', `url\(#\$\{PRISMA_SOLAR_CLIP_ID\}\)`\)/);
  assert.match(engine, /parent\.insertBefore\(coverGroup, placeholderHost \|\| null\)/);
  assert.match(engine, /ensurePrismaSolarPhotoLayer\(doc\);[\s\S]*applyPhotoAsClipLayer/);
  assert.doesNotMatch(engine, /A4 - 11|A4 - 10|capa_11|capa_10/);
});

test('foto da Prisma Solar usa a mesma imagem cover e os mesmos controles das outras capas', async () => {
  const engine = await read('src/features/design-pdf/engines/photoEngine.ts');

  assert.match(engine, /data-pdf-image-mode', 'clip-layer'/);
  assert.match(engine, /data-pdf-image-fit', 'cover'/);
  assert.match(engine, /resolveCoverPhotoPreserveAspectRatio\(transform\)/);
  assert.match(engine, /if \(crop\.transform\) image\.setAttribute\('transform', crop\.transform\)/);
  assert.match(engine, /setHref\(image, imageUrl\)/);
  assert.match(engine, /hidePhotoPlaceholder\(doc\)/);
});
