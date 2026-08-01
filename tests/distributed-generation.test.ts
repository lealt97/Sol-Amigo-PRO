import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePayback } from '../src/lib/calculations/payback';

const BASE_INPUT = {
  proposalPrice: 1_000,
  kitCost: null,
  tariffCentsPerKwh: 100,
  pisPercent: 0,
  cofinsPercent: 0,
  icmsPercent: 0,
  otherTariffsPercent: 0,
  monthlyCompensableConsumptionKwh: 100,
  monthlyGenerationKwh: 100,
  additionalCosts: [],
  analysisYears: 1,
  annualTariffEscalationPercent: 0,
  annualGenerationDegradationPercent: 0,
  annualOperationMaintenancePercent: 0,
  discountRatePercent: 0,
};

test('aplica 60% do Fio B em 2026 somente à energia compensada pela rede', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    distributedGenerationRegime: 'gd2_transition',
    projectionStartYear: 2026,
    projectionStartMonth: 1,
    simultaneousSelfConsumptionPercent: 40,
    fioBTariffCentsPerKwh: 20,
    postTransitionFioBPercent: 100,
  });

  assert.equal(result.monthlyData[1]?.fioBIncidencePercent, 60);
  assert.equal(result.monthlyData[1]?.selfConsumedEnergyKwh, 40);
  assert.equal(result.monthlyData[1]?.gridCompensatedEnergyKwh, 60);
  assert.equal(result.monthlyData[1]?.fioBCharge, 7.2);
  assert.equal(result.monthlyData[1]?.netSavingsAfterDistributedGenerationCharges, 92.8);
  assert.equal(result.firstYearDistributedGenerationCharges, 86.4);
  assert.equal(result.annualSavings, 1_113.6);
});

test('altera a incidência do Fio B ao virar o ano civil', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    distributedGenerationRegime: 'gd2_transition',
    projectionStartYear: 2026,
    projectionStartMonth: 12,
    simultaneousSelfConsumptionPercent: 0,
    fioBTariffCentsPerKwh: 20,
  });

  assert.equal(result.monthlyData[1]?.calendarYear, 2026);
  assert.equal(result.monthlyData[1]?.fioBIncidencePercent, 60);
  assert.equal(result.monthlyData[2]?.calendarYear, 2027);
  assert.equal(result.monthlyData[2]?.fioBIncidencePercent, 75);
});

test('preserva GD I sem cobrança até dezembro de 2045', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    distributedGenerationRegime: 'gd1_grandfathered',
    projectionStartYear: 2045,
    projectionStartMonth: 1,
    simultaneousSelfConsumptionPercent: 0,
    fioBTariffCentsPerKwh: 20,
  });

  assert.equal(result.firstYearDistributedGenerationCharges, 0);
  assert.equal(result.monthlyData[12]?.fioBIncidencePercent, 0);
  assert.equal(result.usesPostTransitionAssumption, false);
});

test('aplica Fio B, 40% do Fio A e encargos na minigeração especial', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    distributedGenerationRegime: 'gd3_special',
    projectionStartYear: 2026,
    projectionStartMonth: 1,
    simultaneousSelfConsumptionPercent: 0,
    fioBTariffCentsPerKwh: 20,
    fioATariffCentsPerKwh: 10,
    sectorChargesCentsPerKwh: 2,
  });

  assert.equal(result.monthlyData[1]?.fioBCharge, 20);
  assert.equal(result.monthlyData[1]?.fioACharge, 4);
  assert.equal(result.monthlyData[1]?.sectorCharges, 2);
  assert.equal(result.monthlyData[1]?.distributedGenerationCharges, 26);
  assert.equal(result.monthlyData[1]?.netSavingsAfterDistributedGenerationCharges, 74);
});

test('marca a regra pós-transição como premissa editável', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    distributedGenerationRegime: 'gd2_transition',
    projectionStartYear: 2029,
    projectionStartMonth: 1,
    simultaneousSelfConsumptionPercent: 0,
    fioBTariffCentsPerKwh: 20,
    postTransitionFioBPercent: 85,
  });

  assert.equal(result.monthlyData[1]?.fioBIncidencePercent, 85);
  assert.equal(result.monthlyData[1]?.usesPostTransitionAssumption, true);
  assert.equal(result.usesPostTransitionAssumption, true);
  assert.ok(result.regulatoryWarnings.some((warning) => warning.includes('ANEEL')));
});

test('exige a componente Fio B quando o regime regulatório está ativo', () => {
  assert.throws(
    () => calculatePayback({
      ...BASE_INPUT,
      distributedGenerationRegime: 'gd2_transition',
      projectionStartYear: 2026,
      fioBTariffCentsPerKwh: 0,
    }),
    /Componente tarifária Fio B deve ser maior que zero/,
  );
});
