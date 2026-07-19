import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  COVER_PHOTO_FIT_MODE,
  fitImageToCover,
  getCoverPhotoViewport,
  normalizeCoverPhotoTransform,
  resolveCoverPhotoPreserveAspectRatio,
  type ImageBounds,
  type ImageDimensions,
} from '../src/features/design-pdf/engines/imageLayout';

const COVER_FILES = Array.from({ length: 12 }, (_, index) => `A4 -${index + 1}.svg`);
const SLOT: ImageBounds = { x: 0, y: 0, width: 300, height: 180 };
const LANDSCAPE: ImageDimensions = { width: 1600, height: 900 };
const PORTRAIT: ImageDimensions = { width: 900, height: 1600 };

function assertCover(slot: ImageBounds, source: ImageDimensions) {
  const fitted = fitImageToCover(slot, source);

  assert.ok(fitted.width >= slot.width - 0.000001);
  assert.ok(fitted.height >= slot.height - 0.000001);
  assert.ok(fitted.x <= slot.x + 0.000001);
  assert.ok(fitted.y <= slot.y + 0.000001);
  assert.ok(fitted.x + fitted.width >= slot.x + slot.width - 0.000001);
  assert.ok(fitted.y + fitted.height >= slot.y + slot.height - 0.000001);
  assert.ok(Math.abs(fitted.width / fitted.height - source.width / source.height) < 0.000001);

  return fitted;
}

function hasSupportedPhotoArea(svg: string) {
  return (
    /id\s*=\s*["'][^"']*cover-photo(?:-layer)?[^"']*["']/i.test(svg)
    || /id\s*=\s*["'][^"']*foto[_\s-]*aqui[^"']*["']/i.test(svg)
    || /data-photo-bounds\s*=/i.test(svg)
  );
}

test('imagem horizontal preenche uma área vertical sem distorção', () => {
  const verticalSlot = { x: 20, y: 30, width: 220, height: 320 };
  const fitted = assertCover(verticalSlot, LANDSCAPE);

  assert.ok(fitted.cropX > 0, 'a imagem horizontal deve ser recortada nas laterais');
  assert.equal(fitted.cropY, 0);
});

test('imagem vertical preenche uma área horizontal sem distorção', () => {
  const fitted = assertCover(SLOT, PORTRAIT);

  assert.equal(fitted.cropX, 0);
  assert.ok(fitted.cropY > 0, 'a imagem vertical deve ser recortada em cima e embaixo');
});

test('zoom inferior a 100% é normalizado para não expor bordas vazias', () => {
  const normalized = normalizeCoverPhotoTransform({ zoom: 0.2, x: 999, y: -999 });
  assert.equal(normalized.zoom, 1);

  const viewport = getCoverPhotoViewport(SLOT, { zoom: 0.2, x: 999, y: -999 });
  assert.deepEqual(viewport, {
    x: 0,
    y: 0,
    width: 300,
    height: 180,
    rotate: 0,
  });
});

test('deslocamentos extremos são limitados e a área continua totalmente coberta', () => {
  const topAligned = fitImageToCover(SLOT, PORTRAIT, { x: 999, y: 999, zoom: 1 });
  const bottomAligned = fitImageToCover(SLOT, PORTRAIT, { x: -999, y: -999, zoom: 1 });

  assert.ok(topAligned.y >= SLOT.y - 0.000001);
  assert.ok(topAligned.y + topAligned.height >= SLOT.y + SLOT.height);
  assert.ok(bottomAligned.y <= SLOT.y);
  assert.ok(bottomAligned.y + bottomAligned.height <= SLOT.y + SLOT.height + 0.000001);
  assertCover(SLOT, PORTRAIT);
});

test('o foco seleciona o alinhamento correto no recorte SVG', () => {
  assert.equal(resolveCoverPhotoPreserveAspectRatio(), 'xMidYMid slice');
  assert.equal(resolveCoverPhotoPreserveAspectRatio({ x: 100, y: 100 }), 'xMinYMin slice');
  assert.equal(resolveCoverPhotoPreserveAspectRatio({ x: -100, y: -100 }), 'xMaxYMax slice');
  assert.equal(COVER_PHOTO_FIT_MODE, 'slice');
});

test('todos os 12 modelos possuem uma área de foto reconhecida pelo motor', async () => {
  for (const fileName of COVER_FILES) {
    const svg = await readFile(
      path.join(process.cwd(), 'public', 'pdf-assets', 'covers', fileName),
      'utf8',
    );

    assert.match(svg, /<svg\b/i, `${fileName}: arquivo SVG inválido`);
    assert.equal(
      hasSupportedPhotoArea(svg),
      true,
      `${fileName}: área de foto não reconhecida`,
    );
  }
});

test('o motor aplica cover/slice nos modos moderno e legado', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'src/features/design-pdf/engines/photoEngine.ts'),
    'utf8',
  );

  assert.match(source, /resolveCoverPhotoPreserveAspectRatio/);
  assert.match(source, /data-pdf-image-fit', 'cover'/);
  assert.doesNotMatch(source, /preserveAspectRatio', 'xMidYMid meet'/);
});

test('os controles impedem zoom menor que 100% para fotos de capa', async () => {
  const source = await readFile(
    path.join(process.cwd(), 'src/features/design-pdf/components/TransformControls.tsx'),
    'utf8',
  );
  const framingSource = await readFile(
    path.join(process.cwd(), 'src/features/design-pdf/components/CoverPhotoFramingSelector.tsx'),
    'utf8',
  );

  assert.match(source, /target === 'cover' \? 1 : 0\.1/);
  assert.match(framingSource, /min="1" max="4"/);
  assert.match(framingSource, /imagem vertical ou horizontal/);
});

test('dimensões inválidas são rejeitadas antes da renderização', () => {
  assert.throws(
    () => fitImageToCover(SLOT, { width: 0, height: 900 }),
    /positive finite dimensions/,
  );
  assert.throws(
    () => getCoverPhotoViewport({ x: 0, y: 0, width: Number.NaN, height: 180 }),
    /positive finite dimensions/,
  );
});
