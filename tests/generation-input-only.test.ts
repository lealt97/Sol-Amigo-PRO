import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const BARREL = 'src/pages/propostas/ProfessionalSizingCalculator.tsx';
const WRAPPER = 'src/pages/propostas/ProfessionalSizingCalculatorInputOnly.tsx';
const STYLES = 'src/pages/propostas/ProfessionalSizingCalculatorInputOnly.css';

test('a etapa de geração adicional exibe somente o input digitável', async () => {
  const [barrel, wrapper, styles] = await Promise.all([
    readFile(BARREL, 'utf8'),
    readFile(WRAPPER, 'utf8'),
    readFile(STYLES, 'utf8'),
  ]);

  assert.match(barrel, /ProfessionalSizingCalculatorInputOnly/);
  assert.match(wrapper, /BaseProfessionalSizingCalculator/);
  assert.match(wrapper, /generation-input-only/);
  assert.match(styles, /> \.flex\.flex-wrap\.gap-2/);
  assert.match(styles, /display: none !important/);
});
