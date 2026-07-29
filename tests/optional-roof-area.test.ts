import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const EDITOR = 'src/pages/propostas/RoofPlanesEditor.tsx';

test('telhado opcional aceita águas com área, inclinação e orientação antes do kit', async () => {
  const [calculator, editor] = await Promise.all([
    readFile(CALCULATOR, 'utf8'),
    readFile(EDITOR, 'utf8'),
  ]);

  assert.match(calculator, /Telhado \(opcional\)/);
  assert.match(calculator, /Dados do telhado — opcional/);
  assert.match(calculator, /<RoofPlanesEditor/);
  assert.match(calculator, /roofOrientationCalculation/);
  assert.match(calculator, /roofOrientationResult/);
  assert.match(calculator, /hasRoofTechnicalData && !roofOrientationResult/);
  assert.match(editor, /Área útil \(opcional\)/);
  assert.match(editor, /Inclinação/);
  assert.match(editor, /Orientação da água/);
  assert.match(editor, /Azimute personalizado/);
  assert.match(editor, /Adicionar água do telhado/);
  assert.match(editor, /Etapa opcional para a pré-proposta/);
});
