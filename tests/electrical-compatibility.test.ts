import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateElectricalCompatibility } from '../src/lib/calculations/electricalCompatibility';

const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('confirma ligação e tensão nominal compatíveis', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'biphase',
    customerVoltageV: 220,
    kitConnectionType: 'biphase',
    kitVoltageV: 220,
  });

  assert.equal(result.status, 'compatible');
  assert.equal(result.requiresConnectionUpgrade, false);
});

test('indica aumento de carga quando o kit exige mais fases', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'monophase',
    customerVoltageV: 220,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'connection_upgrade_required');
  assert.equal(result.requiresConnectionUpgrade, true);
  assert.match(result.guidance, /aumento de carga/i);
});

test('aceita pequena diferença entre tensões nominais', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'biphase',
    customerVoltageV: 220,
    kitConnectionType: 'biphase',
    kitVoltageV: 230,
  });

  assert.equal(result.status, 'compatible');
});

test('solicita adequação quando a tensão diverge além da tolerância', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'triphase',
    customerVoltageV: 220,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'voltage_adaptation_required');
});

test('ligação menor que a unidade exige análise de balanceamento', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'triphase',
    customerVoltageV: 220,
    kitConnectionType: 'monophase',
    kitVoltageV: 220,
  });

  assert.equal(result.status, 'technical_review');
  assert.match(result.guidance, /balanceamento de fases/i);
});

test('catálogo e proposta coletam e exibem os dados elétricos', async () => {
  const [catalog, calculator] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(catalog, /Ligação atendida \*/);
  assert.match(catalog, /Tensão nominal V \*/);
  assert.match(calculator, /Tensão da unidade consumidora/);
  assert.match(calculator, /Compatibilidade elétrica/);
  assert.match(calculator, /A relação está acima da referência de 1,20[\s\S]*não bloqueia a compatibilidade do kit/);
});
