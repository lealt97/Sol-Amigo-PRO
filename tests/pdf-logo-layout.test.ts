import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  COVER_06_LOGO_SLOT,
  DEFAULT_LOGO_SLOT,
  LOGO_PRESERVE_ASPECT_RATIO,
  fitLogoWithinSlot,
  type LogoDimensions,
} from '../src/features/design-pdf/engines/logoLayout';

const COVER_FILES = Array.from({ length: 12 }, (_, index) => `A4 -${index + 1}.svg`);

const LOGO_VARIANTS: Record<string, LogoDimensions> = {
  horizontal: { width: 1200, height: 300 },
  quadrada: { width: 800, height: 800 },
  vertical: { width: 300, height: 1200 },
};

function nearlyEqual(left: number, right: number, epsilon = 0.000001) {
  return Math.abs(left - right) <= epsilon;
}

function hasLogoPlaceholder(svg: string) {
  return (
    /data-logo-slot\s*=/i.test(svg)
    || /id\s*=\s*["'][^"']*logo[^"']*["']/i.test(svg)
  );
}

function assertLogoFits(slot: LogoDimensions, source: LogoDimensions, label: string) {
  const fitted = fitLogoWithinSlot(slot, source);

  assert.ok(fitted.width <= slot.width + 0.000001, `${label}: largura ultrapassou o slot`);
  assert.ok(fitted.height <= slot.height + 0.000001, `${label}: altura ultrapassou o slot`);
  assert.ok(fitted.x >= -0.000001, `${label}: deslocamento horizontal negativo`);
  assert.ok(fitted.y >= -0.000001, `${label}: deslocamento vertical negativo`);

  assert.ok(
    nearlyEqual(fitted.width / fitted.height, source.width / source.height),
    `${label}: proporção original foi alterada`,
  );

  assert.ok(
    nearlyEqual(fitted.x * 2 + fitted.width, slot.width),
    `${label}: logo não ficou centralizada horizontalmente`,
  );
  assert.ok(
    nearlyEqual(fitted.y * 2 + fitted.height, slot.height),
    `${label}: logo não ficou centralizada verticalmente`,
  );
}

test('todos os 12 modelos possuem slot de logo ou fallback documentado', async () => {
  for (const [index, fileName] of COVER_FILES.entries()) {
    const filePath = path.join(process.cwd(), 'public', 'pdf-assets', 'covers', fileName);
    const svg = await readFile(filePath, 'utf8');

    assert.match(svg, /<svg\b/i, `${fileName}: arquivo SVG inválido`);
    assert.match(svg, /viewBox\s*=/i, `${fileName}: viewBox ausente`);

    const coverNumber = index + 1;
    const hasSupportedSlot = hasLogoPlaceholder(svg) || coverNumber === 6;
    assert.equal(
      hasSupportedSlot,
      true,
      `${fileName}: não possui placeholder de logo nem fallback conhecido`,
    );
  }
});

test('logos horizontais, quadradas e verticais cabem sem corte no slot padrão', () => {
  for (const [variant, dimensions] of Object.entries(LOGO_VARIANTS)) {
    assertLogoFits(DEFAULT_LOGO_SLOT, dimensions, `slot padrão / ${variant}`);
  }
});

test('logos horizontais, quadradas e verticais cabem sem corte no fallback da capa 06', () => {
  for (const [variant, dimensions] of Object.entries(LOGO_VARIANTS)) {
    assertLogoFits(COVER_06_LOGO_SLOT, dimensions, `capa 06 / ${variant}`);
  }
});

test('o SVG usa centralização e modo meet para preservar a logo completa', () => {
  assert.equal(LOGO_PRESERVE_ASPECT_RATIO, 'xMidYMid meet');
});

test('dimensões inválidas são rejeitadas antes da renderização', () => {
  assert.throws(
    () => fitLogoWithinSlot(DEFAULT_LOGO_SLOT, { width: 0, height: 100 }),
    /positive finite dimensions/,
  );
  assert.throws(
    () => fitLogoWithinSlot({ width: Number.NaN, height: 64 }, LOGO_VARIANTS.horizontal),
    /positive finite dimensions/,
  );
});
