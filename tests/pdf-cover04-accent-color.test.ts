import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const COLOR_ENGINE = path.join(
  process.cwd(),
  'src',
  'features',
  'design-pdf',
  'engines',
  'colorEngine.ts',
);

const SVG_TEMPLATE_ENGINE = path.join(
  process.cwd(),
  'src',
  'features',
  'design-pdf',
  'engines',
  'svgTemplateEngine.ts',
);

const TEMPLATE_CAROUSEL = path.join(
  process.cwd(),
  'src',
  'features',
  'design-pdf',
  'components',
  'TemplateCarousel.tsx',
);

const COVER_04 = path.join(
  process.cwd(),
  'public',
  'pdf-assets',
  'covers',
  'A4 -4.svg',
);

test('a inscrição lateral da capa 04 usa semanticamente a cor destaque', async () => {
  const [engine, svg] = await Promise.all([
    readFile(COLOR_ENGINE, 'utf8'),
    readFile(COVER_04, 'utf8'),
  ]);

  assert.match(svg, /id="A4 - 4"/);
  assert.match(svg, /id="Sistema de Energia sola Fotovoltaica"/);

  assert.match(engine, /doc\.getElementById\('capa_4'\)/);
  assert.match(engine, /doc\.getElementById\('A4 - 4'\)/);
  assert.match(engine, /Sistema de Energia Solar Fotovoltaica/);
  assert.match(engine, /data-cover04-solar-r/);
  assert.match(engine, /theme\.current\.accent/);
  assert.match(engine, /applyCoverSpecificPaints\(doc, theme\)/);
});

test('o motor preserva os vetores e desloca todo o trecho posterior a Solar', async () => {
  const engine = await readFile(SVG_TEMPLATE_ENGINE, 'utf8');

  assert.match(engine, /COVER_04_SIDE_LABEL_SOURCE_ID = 'Sistema de Energia sola Fotovoltaica'/);
  assert.match(engine, /COVER_04_SOURCE_R_INDEX = 12/);
  assert.match(engine, /COVER_04_TARGET_PREVIOUS_INDEX = 19/);
  assert.match(engine, /COVER_04_TARGET_NEXT_INDEX = 20/);
  assert.match(engine, /rebuildCover04SideLabelVector\(doc\)/);
  assert.match(engine, /sourceRGlyph\.subpaths\.map/);
  assert.match(engine, /sourceRGlyph\.centerY - sourcePreviousGlyph\.centerY/);
  assert.match(engine, /index >= COVER_04_TARGET_NEXT_INDEX/);
  assert.match(engine, /data-cover04-shifted-tail/);
  assert.match(engine, /originalLabel\.replaceWith\(correctedGroup\)/);

  assert.doesNotMatch(engine, /createElementNS\(SVG_NS, 'text'\)/);
  assert.doesNotMatch(engine, /font-family/);
  assert.doesNotMatch(engine, /textLength/);
});

test('a miniatura do modelo padrão A4 04 passa pelo mesmo motor vetorial', async () => {
  const carousel = await readFile(TEMPLATE_CAROUSEL, 'utf8');

  assert.match(carousel, /preset\.id !== 'preset-4'/);
  assert.match(carousel, /buildSvgTemplate\(/);
  assert.match(carousel, /correctedPresetPreviews/);
  assert.match(carousel, /dangerouslySetInnerHTML/);
});
