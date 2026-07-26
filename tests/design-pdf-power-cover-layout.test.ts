import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ENGINE = 'src/features/design-pdf/engines/svgTemplateEngine.ts';

test('o ajuste de potência é específico da capa 1 e preserva as coordenadas dos slots', async () => {
  const source = await readFile(ENGINE, 'utf8');

  assert.match(source, /COVER_POWER_TEXT_LAYOUTS/);
  assert.match(source, /coverSelector: '\[id="A4 - 1"\], \[id="capa_1"\]'/);
  assert.match(source, /applyCoverSpecificPowerTextLayout\(doc\)/);
  assert.match(source, /currentFontSize \* layout\.fontScale/);
  assert.match(source, /data-power-layout', 'cover-specific'/);

  assert.doesNotMatch(source, /alignmentReference/);
  assert.doesNotMatch(source, /referenceX/);
  assert.doesNotMatch(source, /element\.setAttribute\('x'/);
});
