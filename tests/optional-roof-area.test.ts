import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('área do telhado é informada diretamente e validada antes do kit', async () => {
  const source = await readFile(CALCULATOR, 'utf8');

  assert.match(source, /Área do telhado M²/);
  assert.match(source, /label="Área do telhado"/);
  assert.match(source, /const parsedRoofArea = parseNumber\(roofAreaM2\)/);
  assert.match(source, /Informe a área do telhado em m² com um valor maior que zero/);
  assert.doesNotMatch(source, /Área do telhado \(opcional\)/);
  assert.doesNotMatch(source, /if \(roofAreaM2\.trim\(\)\)/);
});
