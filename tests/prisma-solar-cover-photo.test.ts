import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('A4 12 possui slot legado mascarado que deve ser promovido ao contrato compartilhado', async () => {
  const svg = await read('public/pdf-assets/covers/A4 -12.svg');

  assert.match(svg, /id="A4 - 12"/);
  assert.match(svg, /<mask id="mask0_326_18"/);
  assert.match(svg, /<path id="Vector 28"[^>]*fill="url\(#pattern0_326_18\)"/);
  assert.match(svg, /<g mask="url\(#mask0_326_18\)">[\s\S]*id="foto_aqui_icon"/);
  assert.doesNotMatch(svg, /id="cover-photo-layer"/);
});

test('motor promove qualquer slot mascarado legado sem regra exclusiva por capa', async () => {
  const engine = await read('src/features/design-pdf/engines/photoEngine.ts');

  assert.match(engine, /const PHOTO_PLACEHOLDER_SELECTOR/);
  assert.match(engine, /function findLegacyMaskedPhotoSlot/);
  assert.match(engine, /const host = placeholder\.closest\('g\[mask\]'\)/);
  assert.match(engine, /getUrlReference\(host\.getAttribute\('mask'\)\)/);
  assert.match(engine, /function upgradeMaskedPhotoSlotToStandardContract/);
  assert.match(engine, /sourceShape\.setAttribute\('fill', '#FFFFFF'\)/);
  assert.match(engine, /host\.setAttribute\('id', 'cover-photo'\)/);
  assert.match(engine, /host\.setAttribute\('data-photo-layout', 'standard-mask-slot'\)/);
  assert.match(engine, /layer\.setAttribute\('id', 'cover-photo-layer'\)/);
  assert.match(engine, /host\.insertBefore\(layer, host\.firstChild\)/);
  assert.match(engine, /upgradeMaskedPhotoSlotToStandardContract\(doc\);[\s\S]*applyPhotoAsClipLayer/);

  assert.doesNotMatch(
    engine,
    /PRISMA_SOLAR|A4 - 12|capa_12|prisma-solar|data-prisma-solar/,
  );
});

test('A4 12 usa o mesmo modo de imagem e os mesmos controles das capas modernas', async () => {
  const engine = await read('src/features/design-pdf/engines/photoEngine.ts');

  assert.match(engine, /data-pdf-image-mode', 'clip-layer'/);
  assert.match(engine, /data-pdf-image-fit', 'cover'/);
  assert.match(engine, /resolveCoverPhotoPreserveAspectRatio\(transform\)/);
  assert.match(engine, /if \(crop\.transform\) image\.setAttribute\('transform', crop\.transform\)/);
  assert.match(engine, /setHref\(image, imageUrl\)/);
  assert.match(engine, /hidePhotoPlaceholder\(doc\)/);
});
