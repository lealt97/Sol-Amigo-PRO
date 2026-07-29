import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR_VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const CALCULATOR_ENTRY = 'src/pages/propostas/ProfessionalSizingCalculator.tsx';
const ROOF_EDITOR = 'src/pages/propostas/RoofPlanesEditor.tsx';

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

test('o resumo exibe orientação e energia diária antes da potência necessária', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /label="Fator solar do telhado"/);
  assert.match(calculator, /label="Rendimento global efetivo"/);
  assert.match(calculator, /label="Energia de geração"/);
  assert.match(calculator, /result\.targetDailyGenerationKwh\.toLocaleString/);
  assert.match(
    calculator,
    /label="HSP"[\s\S]*label="Fator solar do telhado"[\s\S]*label="Rendimento global efetivo"[\s\S]*label="Energia de geração"[\s\S]*label="Potência necessária"/,
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

test('a aba opcional do telhado recebe as águas e continua usando dimensões do kit quando disponíveis', async () => {
  const [calculator, roofEditor] = await Promise.all([
    readFile(CALCULATOR_VIEW, 'utf8'),
    readFile(ROOF_EDITOR, 'utf8'),
  ]);

  assert.match(calculator, /Telhado \(opcional\)/);
  assert.match(calculator, /<RoofPlanesEditor/);
  assert.match(roofEditor, /Área útil \(opcional\)/);
  assert.match(roofEditor, /Inclinação/);
  assert.match(roofEditor, /Orientação da água/);
  assert.doesNotMatch(calculator, /label="Potência do módulo"/);
  assert.doesNotMatch(calculator, /label="Largura do módulo"/);
  assert.doesNotMatch(calculator, /label="Altura do módulo"/);
  assert.match(calculator, /selectedKit\.module_height_m/);
  assert.match(calculator, /selectedKit\.module_width_m/);
  assert.match(calculator, /moduleQuantity: selectedKit\.module_quantity/);
  assert.match(calculator, /Os módulos do kit cabem na área útil do telhado/);
  assert.match(calculator, /Os módulos do kit não cabem na área útil do telhado/);
});

test('a configuração opcional das águas permanece antes da seleção opcional do kit', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'irradiation'[\s\S]*id: 'modules', title: 'Telhado \(opcional\)'[\s\S]*id: 'kit', title: 'Kit de referência \(opcional\)'/,
  );
  assert.match(
    calculator,
    /currentStep === 3[\s\S]*Dados do telhado — opcional[\s\S]*currentStep === 4[\s\S]*Kit solar de referência — opcional/,
  );
  assert.match(calculator, /if \(currentStep === 3\) \{[\s\S]*hasRoofTechnicalData/);
  assert.doesNotMatch(calculator, /toast\.error\('Selecione um kit on-grid cadastrado\.'/);
});

test('a foto do telhado é exibida e persistida dentro da aba opcional', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /import \{ RoofPhotoUpload \} from '\.\/RoofPhotoUpload';/);
  assert.match(
    calculator,
    /currentStep === 3[\s\S]*<RoofPhotoUpload[\s\S]*clientId=\{selectedClient\?\.id \?\? null\}[\s\S]*initialStorageReference=\{roofPhotoReference\}[\s\S]*onReferenceChange=\{setRoofPhotoReference\}[\s\S]*currentStep === 4/,
  );
});
