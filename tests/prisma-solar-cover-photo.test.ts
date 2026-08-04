import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('A4 12 usa o pattern apenas dentro da máscara e exige uma forma visível própria', async () => {
  const svg = await read('public/pdf-assets/covers/A4 -12.svg');

  assert.match(svg, /id="A4 - 12"/);
  assert.match(svg, /<mask id="mask0_326_18"/);
  assert.match(svg, /<path id="Vector 28"[^>]*fill="url\(#pattern0_326_18\)"/);
  assert.match(svg, /<g mask="url\(#mask0_326_18\)">[\s\S]*id="foto_aqui_icon"/);
  assert.doesNotMatch(svg, /data-prisma-solar-photo-shape="true"/);
});

test('motor clona exclusivamente a geometria da Prisma Solar como path visível', async () => {
  const engine = await read('src/features/design-pdf/engines/photoEngine.ts');

  assert.match(engine, /PRISMA_SOLAR_COVER_SELECTOR = '\[id="A4 - 12"\], \[id="capa_12"\]'/);
  assert.match(engine, /PRISMA_SOLAR_MASK_ID = 'mask0_326_18'/);
  assert.match(engine, /PRISMA_SOLAR_VISIBLE_SHAPE_ID = 'cover-photo-shape-prisma-solar'/);
  assert.match(engine, /function ensurePrismaSolarVisiblePhotoShape/);
  assert.match(engine, /const sourceShape = mask\?\.querySelector\('path\[fill\^="url\(#"\]'\)/);
  assert.match(engine, /const visibleShape = sourceShape\.cloneNode\(false\) as Element/);
  assert.match(engine, /visibleShape\.setAttribute\('fill', patternReference\)/);
  assert.match(engine, /visibleShape\.setAttribute\('display', 'block'\)/);
  assert.match(engine, /visibleShape\.setAttribute\('opacity', '1'\)/);
  assert.match(engine, /visibleShape\.setAttribute\('data-prisma-solar-photo-shape', 'true'\)/);
  assert.match(engine, /parent\.insertBefore\(visibleShape, placeholderHost \|\| null\)/);
  assert.match(engine, /ensurePrismaSolarVisiblePhotoShape\(doc\);[\s\S]*applyPhotoAsPattern/);
  assert.doesNotMatch(engine, /PRISMA_SOLAR_CLIP_ID|prisma-solar-mask-to-clip/);
  assert.doesNotMatch(engine, /A4 - 11|A4 - 10|capa_11|capa_10/);
});

test('foto da Prisma Solar usa pattern cover e os mesmos controles das outras capas', async () => {
  const engine = await read('src/features/design-pdf/engines/photoEngine.ts');

  assert.match(engine, /data-pdf-image-mode', 'crop'/);
  assert.match(engine, /data-pdf-image-fit', 'cover'/);
  assert.match(engine, /resolveCoverPhotoPreserveAspectRatio\(transform\)/);
  assert.match(engine, /if \(crop\.rotate\) image\.setAttribute\('transform', `rotate\(\$\{crop\.rotate\} 0\.5 0\.5\)`\)/);
  assert.match(engine, /setHref\(image, imageUrl\)/);
  assert.match(engine, /hidePhotoPlaceholder\(doc\)/);
});
