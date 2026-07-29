import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('editor do telhado usa orientação da água e mantém pontos colaterais', async () => {
  const [editor, roofTypes] = await Promise.all([
    readFile('src/pages/propostas/RoofPlanesEditor.tsx', 'utf8'),
    readFile('src/types/roof.ts', 'utf8'),
  ]);

  assert.match(editor, />Orientação da água</);
  assert.match(editor, /ponto cardeal ou colateral/);
  assert.doesNotMatch(editor, />Ponto cardeal</);
  assert.match(roofTypes, /Nordeste \(NE\)/);
  assert.match(roofTypes, /Sudeste \(SE\)/);
  assert.match(roofTypes, /Sudoeste \(SO\)/);
  assert.match(roofTypes, /Noroeste \(NO\)/);
  assert.match(editor, /Azimute personalizado/);
});
