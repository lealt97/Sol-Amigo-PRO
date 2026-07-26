import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ENGINE = 'src/features/design-pdf/engines/svgTemplateEngine.ts';

test('a potência da capa fica maior e alinhada aos dados acima', async () => {
  const source = await readFile(ENGINE, 'utf8');

  assert.match(source, /applyPowerTextLayout\(doc\)/);
  assert.match(source, /text-anchor', 'start'/);
  assert.match(source, /text\[data-bind="clientName"\].*text\[data-bind="cityState"\]/s);
  assert.match(source, /currentFontSize \* 1\.15/);
  assert.match(source, /data-power-layout', 'aligned-and-enlarged'/);
});
