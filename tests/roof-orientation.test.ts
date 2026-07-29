import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  calculateRoofOrientation,
  calculateRoofPlaneOrientationFactor,
} from '../src/lib/calculations/roofOrientation';
import { calculateProfessionalSizing } from '../src/lib/calculations/professionalSizing';

const approximatelyEqual = (actual: number, expected: number, tolerance = 0.0001) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Esperado ${expected}, recebido ${actual}`);
};

test('orientação de referência no hemisfério sul mantém fator próximo de 100%', () => {
  const factor = calculateRoofPlaneOrientationFactor({
    latitudeDegrees: -20,
    tiltDegrees: 20,
    azimuthDegrees: 0,
  });

  assert.ok(factor >= 0.99 && factor <= 1);
});

test('leste e sul reduzem o fator solar em relação ao norte no hemisfério sul', () => {
  const north = calculateRoofPlaneOrientationFactor({ latitudeDegrees: -20, tiltDegrees: 20, azimuthDegrees: 0 });
  const east = calculateRoofPlaneOrientationFactor({ latitudeDegrees: -20, tiltDegrees: 20, azimuthDegrees: 90 });
  const south = calculateRoofPlaneOrientationFactor({ latitudeDegrees: -20, tiltDegrees: 20, azimuthDegrees: 180 });

  assert.ok(north > east);
  assert.ok(east > south);
  assert.ok(south >= 0.35);
});

test('rendimento do telhado é ponderado pela área útil de cada água', () => {
  const result = calculateRoofOrientation({
    latitudeDegrees: -20,
    planes: [
      { id: 'north', name: 'Água norte', areaM2: 30, tiltDegrees: 20, azimuthDegrees: 0, cardinalDirection: 'N' },
      { id: 'west', name: 'Água oeste', areaM2: 10, tiltDegrees: 20, azimuthDegrees: 270, cardinalDirection: 'W' },
    ],
  });

  const north = result.planes[0].orientationFactor;
  const west = result.planes[1].orientationFactor;
  const expected = (north * 30 + west * 10) / 40;

  approximatelyEqual(result.totalAreaM2, 40, 0.001);
  approximatelyEqual(result.weightedOrientationFactor, expected, 0.0001);
  assert.ok(result.weightedOrientationFactor < north);
  assert.ok(result.weightedOrientationFactor > west);
});

test('fator solar reduz geração do kit e aumenta potência necessária', () => {
  const baseInput = {
    monthlyConsumptionKwh: Array.from({ length: 12 }, () => 600),
    connectionType: 'biphase' as const,
    hspDaily: 5.2,
    performanceRatioPercent: 80,
    generationIncreasePercent: 0,
    selectedKitPowerKwp: 4.95,
  };

  const reference = calculateProfessionalSizing({ ...baseInput, roofOrientationFactor: 1 });
  const affected = calculateProfessionalSizing({ ...baseInput, roofOrientationFactor: 0.8 });

  approximatelyEqual(affected.effectivePerformanceRatioPercent, 64, 0.01);
  assert.ok(affected.requiredPowerKwp > reference.requiredPowerKwp);
  assert.ok((affected.selectedKitEstimatedMonthlyGenerationKwh ?? 0) < (reference.selectedKitEstimatedMonthlyGenerationKwh ?? 0));
  approximatelyEqual(affected.roofOrientationFactor, 0.8, 0.0001);
});

test('wizard persiste as águas e aplica o fator ao dimensionamento e payback', async () => {
  const source = await readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8');

  assert.match(source, /roofOrientationFactor: roofOrientationResult\?\.weightedOrientationFactor \?\? 1/);
  assert.match(source, /siteLatitudeDegrees,/);
  assert.match(source, /roofPlanes,/);
  assert.match(source, /roof_planes_json:/);
  assert.match(source, /effective_performance_ratio:/);
  assert.match(source, /monthlyGenerationKwh=\{result\.selectedKitEstimatedMonthlyGenerationKwh/);
});

test('migration protege os campos de orientação do telhado', async () => {
  const migration = await readFile('supabase/migrations/20260729111500_add_roof_orientation_to_proposals.sql', 'utf8');

  assert.match(migration, /roof_latitude_degrees numeric/);
  assert.match(migration, /roof_planes_json jsonb/);
  assert.match(migration, /roof_orientation_factor numeric/);
  assert.match(migration, /effective_performance_ratio numeric/);
  assert.match(migration, /proposals_roof_planes_is_array/);
  assert.match(migration, /proposals_roof_orientation_factor_range/);
});
