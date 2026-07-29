import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const EDITOR = 'src/pages/propostas/RoofPlanesEditor.tsx';

test('telhado é dividido em águas com área, inclinação e orientação antes do kit', async () => {
  const [calculator, editor] = await Promise.all([
    readFile(CALCULATOR, 'utf8'),
    readFile(EDITOR, 'utf8'),
  ]);

  assert.match(calculator, /Telhado e orientação/);
  assert.match(calculator, /Águas, inclinação e orientação do telhado/);
  assert.match(calculator, /<RoofPlanesEditor/);
  assert.match(calculator, /roofOrientationCalculation/);
  assert.match(calculator, /roofOrientationResult/);
  assert.match(editor, /Área útil/);
  assert.match(editor, /Inclinação/);
  assert.match(editor, /Orientação da água/);
  assert.match(editor, /Azimute personalizado/);
  assert.match(editor, /Adicionar água do telhado/);
  assert.doesNotMatch(calculator, /Área do telhado \(opcional\)/);
});
