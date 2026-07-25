import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR_VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const CALCULATOR_ENTRY = 'src/pages/propostas/ProfessionalSizingCalculator.tsx';

test('a etapa de geração adicional exibe somente o input digitável', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /label="Geração adicional desejada"/);
  assert.match(
    calculator,
    /O percentual é aplicado sobre o consumo compensável\. Use 0% quando o cliente não solicitar geração adicional\./,
  );
  assert.doesNotMatch(calculator, /\[0, 10, 20, 30\]/);
  assert.doesNotMatch(calculator, /setGenerationIncreasePercent\(String\(percentage\)\)/);
});

test('o resumo exibe a energia diária entre HSP e potência necessária', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /label="Energia de geração"/);
  assert.match(calculator, /result\.targetDailyGenerationKwh\.toLocaleString/);
  assert.match(
    calculator,
    /label="HSP"[\s\S]*label="Energia de geração"[\s\S]*label="Potência necessária"/,
  );
});

test('o resumo identifica dinamicamente o tipo de ligação na disponibilidade', async () => {
  const calculatorEntry = await readFile(CALCULATOR_ENTRY, 'utf8');

  assert.match(calculatorEntry, /monophase: 'Monofásica — 30 kWh'/);
  assert.match(calculatorEntry, /biphase: 'Bifásica — 50 kWh'/);
  assert.match(calculatorEntry, /triphase: 'Trifásica — 100 kWh'/);
  assert.match(calculatorEntry, /connectionSelect\.value/);
  assert.match(calculatorEntry, /term\.textContent\?\.trim\(\) === 'Disponibilidade'/);
  assert.match(calculatorEntry, /MutationObserver/);
  assert.match(calculatorEntry, /addEventListener\('change', synchronize\)/);
});

test('a aba do telhado recebe apenas a área e usa as dimensões cadastradas no kit', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /Área do telhado M²/);
  assert.match(calculator, /label="Área do telhado"/);
  assert.doesNotMatch(calculator, /label="Potência do módulo"/);
  assert.doesNotMatch(calculator, /label="Largura do módulo"/);
  assert.doesNotMatch(calculator, /label="Altura do módulo"/);
  assert.match(calculator, /selectedKit\.module_height_m/);
  assert.match(calculator, /selectedKit\.module_width_m/);
  assert.match(calculator, /moduleQuantity: selectedKit\.module_quantity/);
  assert.match(calculator, /Os módulos do kit cabem na área útil do telhado/);
  assert.match(calculator, /Os módulos do kit não cabem na área útil do telhado/);
});

test('a área do telhado permanece na aba 4 antes da seleção do kit', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'irradiation'[\s\S]*id: 'modules', title: 'Área do telhado M²'[\s\S]*id: 'kit'/,
  );
  assert.match(
    calculator,
    /currentStep === 3[\s\S]*Área do telhado M²[\s\S]*currentStep === 4[\s\S]*Seleção do kit cadastrado/,
  );
  assert.match(calculator, /if \(currentStep === 3\) \{[\s\S]*parseNumber\(roofAreaM2\)/);
  assert.match(calculator, /if \(currentStep === 4\) \{[\s\S]*dimensões A × L/);
});

test('a foto do telhado é exibida e persistida dentro da aba 4', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /import \{ RoofPhotoUpload \} from '\.\/RoofPhotoUpload';/);
  assert.match(
    calculator,
    /currentStep === 3[\s\S]*<RoofPhotoUpload[\s\S]*clientId=\{selectedClient\?\.id \?\? null\}[\s\S]*initialStorageReference=\{roofPhotoReference\}[\s\S]*onReferenceChange=\{setRoofPhotoReference\}[\s\S]*currentStep === 4/,
  );
});
