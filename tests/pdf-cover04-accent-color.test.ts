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
  assert.match(engine, /theme\.current\.accent/);
  assert.match(engine, /applyCoverSpecificPaints\(doc, theme\)/);
});

test('o motor substitui o vetor legado pela frase com Solar corretamente', async () => {
  const engine = await readFile(SVG_TEMPLATE_ENGINE, 'utf8');

  assert.match(engine, /COVER_04_SIDE_LABEL_SOURCE_ID = 'Sistema de Energia sola Fotovoltaica'/);
  assert.match(engine, /COVER_04_SIDE_LABEL_TEXT = 'Sistema de Energia Solar Fotovoltaica'/);
  assert.match(engine, /correctCover04SideLabel\(doc, input\.theme\.current\.accent\)/);
  assert.match(engine, /originalLabel\.replaceWith\(correctedLabel\)/);
  assert.match(engine, /textLength/);
  assert.match(engine, /lengthAdjust', 'spacingAndGlyphs'/);
});
