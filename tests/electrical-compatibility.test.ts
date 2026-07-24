import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateElectricalCompatibility } from '../src/lib/calculations/electricalCompatibility';
import {
  ELECTRICAL_STANDARD_OPTIONS,
  getElectricalStandard,
  inferElectricalStandardId,
} from '../src/lib/calculations/electricalStandards';

const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('expõe os seis padrões elétricos definidos para a unidade', () => {
  assert.deepEqual(
    ELECTRICAL_STANDARD_OPTIONS.map((standard) => standard.label),
    [
      'Monofásico — 127 V',
      'Monofásico — 220 V',
      'Bifásico — 127/220 V',
      'Bifásico — 220/380 V',
      'Trifásico — 127/220 V',
      'Trifásico — 220/380 V',
    ],
  );
});

test('confirma kit de 220 V em padrão bifásico 127/220 V', () => {
  const standard = getElectricalStandard('biphase_127_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'biphase',
    kitVoltageV: 220,
  });

  assert.equal(result.status, 'compatible');
  assert.equal(result.requiresConnectionUpgrade, false);
});

test('confirma kit de 380 V em padrão trifásico 220/380 V', () => {
  const standard = getElectricalStandard('triphase_220_380');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'compatible');
});

test('indica aumento de carga quando o kit exige mais fases', () => {
  const standard = getElectricalStandard('monophase_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'connection_upgrade_required');
  assert.equal(result.requiresConnectionUpgrade, true);
  assert.match(result.guidance, /aumento de carga/i);
});

test('aceita pequena diferença entre tensões nominais', () => {
  const standard = getElectricalStandard('monophase_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'monophase',
    kitVoltageV: 230,
  });

  assert.equal(result.status, 'compatible');
});

test('trata tensão fora do padrão apenas como análise técnica', () => {
  const standard = getElectricalStandard('triphase_127_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'technical_review');
  assert.match(result.guidance, /não significa automaticamente/i);
});

test('converte os dados antigos do rascunho para o padrão unificado', () => {
  assert.equal(inferElectricalStandardId('monophase', 220), 'monophase_220');
  assert.equal(inferElectricalStandardId('biphase', 220), 'biphase_127_220');
  assert.equal(inferElectricalStandardId('triphase', 380), 'triphase_220_380');
});

test('catálogo mantém dados do kit e proposta usa um único campo da unidade', async () => {
  const [catalog, calculator] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(catalog, /Ligação atendida \*/);
  assert.match(catalog, /Tensão nominal V \*/);
  assert.match(calculator, /Padrão elétrico da unidade/);
  assert.doesNotMatch(calculator, /label="Tensão da unidade consumidora"/);
  assert.match(calculator, /Compatibilidade elétrica/);
  assert.match(calculator, /A referência de 1,20 é apenas comparativa[\s\S]*limites específicos cadastrados/);
});
