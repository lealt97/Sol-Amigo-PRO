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

test('o fluxo calcula quantidade de módulos, áreas e status do telhado', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /calculateModuleQuantity/);
  assert.match(calculator, /calculateModuleSizing/);
  assert.match(calculator, /label="Potência do módulo"/);
  assert.match(calculator, /label="Largura do módulo"/);
  assert.match(calculator, /label="Altura do módulo"/);
  assert.match(calculator, /label="Área do telhado \(opcional\)"/);
  assert.doesNotMatch(calculator, /label="Largura útil do telhado"/);
  assert.doesNotMatch(calculator, /label="Altura útil do telhado"/);
  assert.doesNotMatch(calculator, /Com 275 Wp e potência necessária de 4,556 kWp/);
  assert.match(calculator, /Quantidade de módulos e área do telhado/);
  assert.match(calculator, /modulesFitRoof/);
  assert.match(calculator, /Os módulos cabem na área útil do telhado/);
  assert.match(calculator, /Os módulos não cabem na área útil do telhado/);
});

test('a quantidade de módulos e área do telhado ocupa a aba 4 separada', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'irradiation'[\s\S]*id: 'modules', title: 'Quantidade de módulos e área do telhado'[\s\S]*id: 'kit'/,
  );
  assert.match(
    calculator,
    /currentStep === 2[\s\S]*HSP, rendimento e meta de geração[\s\S]*currentStep === 3[\s\S]*Quantidade de módulos e área do telhado[\s\S]*currentStep === 4[\s\S]*Seleção do kit cadastrado/,
  );
  assert.match(calculator, /if \(currentStep === 3\) \{[\s\S]*const moduleFields = \[/);
  assert.match(calculator, /if \(currentStep === 4 && !selectedKit\)/);
});

test('a foto do telhado é exibida e persistida dentro da aba 4', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /import \{ RoofPhotoUpload \} from '\.\/RoofPhotoUpload';/);
  assert.match(
    calculator,
    /currentStep === 3[\s\S]*<RoofPhotoUpload[\s\S]*clientId=\{selectedClient\?\.id \?\? null\}[\s\S]*initialStorageReference=\{roofPhotoReference\}[\s\S]*onReferenceChange=\{setRoofPhotoReference\}[\s\S]*currentStep === 4/,
  );
});
