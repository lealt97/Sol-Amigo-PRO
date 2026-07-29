export const CONNECTION_AVAILABILITY_KWH = {
  monophase: 30,
  biphase: 50,
  triphase: 100,
} as const;

export type ConnectionType = keyof typeof CONNECTION_AVAILABILITY_KWH;

export type ProfessionalSizingInput = {
  monthlyConsumptionKwh: number[];
  connectionType: ConnectionType;
  hspDaily: number;
  performanceRatioPercent: number;
  roofOrientationFactor?: number;
  generationIncreasePercent?: number;
  selectedKitPowerKwp?: number | null;
};

export type ProfessionalSizingResult = {
  annualConsumptionKwh: number;
  averageMonthlyConsumptionKwh: number;
  availabilityConsumptionKwh: number;
  compensableMonthlyConsumptionKwh: number;
  compensableDailyConsumptionKwh: number;
  generationIncreasePercent: number;
  targetMonthlyGenerationKwh: number;
  targetDailyGenerationKwh: number;
  basePerformanceRatio: number;
  roofOrientationFactor: number;
  performanceRatio: number;
  effectivePerformanceRatioPercent: number;
  requiredPowerKwp: number;
  selectedKitPowerKwp: number | null;
  selectedKitEstimatedMonthlyGenerationKwh: number | null;
  selectedKitCoveragePercent: number | null;
  selectedKitEnergyBalanceKwh: number | null;
  selectedKitIsAdequate: boolean | null;
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const truncate = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.trunc(value * factor) / factor;
};

const assertFinite = (value: number, field: string) => {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} deve ser um número válido.`);
  }
};

const validateInput = (input: ProfessionalSizingInput) => {
  if (input.monthlyConsumptionKwh.length !== 12) {
    throw new Error('Informe o consumo dos 12 meses da conta de energia.');
  }

  input.monthlyConsumptionKwh.forEach((consumption, index) => {
    assertFinite(consumption, `Consumo do mês ${index + 1}`);
    if (consumption < 0) {
      throw new Error(`O consumo do mês ${index + 1} não pode ser negativo.`);
    }
  });

  if (!(input.connectionType in CONNECTION_AVAILABILITY_KWH)) {
    throw new Error('Selecione um tipo de ligação válido.');
  }

  assertFinite(input.hspDaily, 'HSP diária');
  if (input.hspDaily <= 0) {
    throw new Error('A HSP diária deve ser maior que zero.');
  }

  assertFinite(input.performanceRatioPercent, 'Rendimento-base');
  if (input.performanceRatioPercent <= 0 || input.performanceRatioPercent > 100) {
    throw new Error('O rendimento-base deve ser maior que 0% e menor ou igual a 100%.');
  }

  const roofOrientationFactor = input.roofOrientationFactor ?? 1;
  assertFinite(roofOrientationFactor, 'Fator solar do telhado');
  if (roofOrientationFactor <= 0 || roofOrientationFactor > 1) {
    throw new Error('O fator solar do telhado deve ser maior que 0 e menor ou igual a 1.');
  }

  const generationIncreasePercent = input.generationIncreasePercent ?? 0;
  assertFinite(generationIncreasePercent, 'Geração adicional');
  if (generationIncreasePercent < 0 || generationIncreasePercent > 100) {
    throw new Error('A geração adicional deve estar entre 0% e 100%.');
  }

  if (input.selectedKitPowerKwp != null) {
    assertFinite(input.selectedKitPowerKwp, 'Potência do kit');
    if (input.selectedKitPowerKwp <= 0) {
      throw new Error('A potência do kit selecionado deve ser maior que zero.');
    }
  }
};

export function calculateProfessionalSizing(
  input: ProfessionalSizingInput,
): ProfessionalSizingResult {
  validateInput(input);

  const annualConsumptionKwh = input.monthlyConsumptionKwh.reduce(
    (total, consumption) => total + consumption,
    0,
  );
  const averageMonthlyConsumptionKwh = annualConsumptionKwh / 12;
  const availabilityConsumptionKwh = CONNECTION_AVAILABILITY_KWH[input.connectionType];
  const compensableMonthlyConsumptionKwh = Math.max(
    averageMonthlyConsumptionKwh - availabilityConsumptionKwh,
    0,
  );

  if (compensableMonthlyConsumptionKwh <= 0) {
    throw new Error('O consumo médio precisa ser maior que o custo de disponibilidade.');
  }

  const compensableDailyConsumptionKwh = compensableMonthlyConsumptionKwh / 30;
  const generationIncreasePercent = input.generationIncreasePercent ?? 0;
  const targetMonthlyGenerationKwh = compensableMonthlyConsumptionKwh
    * (1 + generationIncreasePercent / 100);
  const targetDailyGenerationKwh = targetMonthlyGenerationKwh / 30;
  const basePerformanceRatio = input.performanceRatioPercent / 100;
  const roofOrientationFactor = input.roofOrientationFactor ?? 1;
  const performanceRatio = basePerformanceRatio * roofOrientationFactor;
  const requiredPowerKwp = targetDailyGenerationKwh
    / (input.hspDaily * performanceRatio);

  const selectedKitPowerKwp = input.selectedKitPowerKwp ?? null;
  const selectedKitEstimatedMonthlyGenerationKwh = selectedKitPowerKwp == null
    ? null
    : selectedKitPowerKwp * input.hspDaily * 30 * performanceRatio;
  const selectedKitCoveragePercent = selectedKitEstimatedMonthlyGenerationKwh == null
    ? null
    : (selectedKitEstimatedMonthlyGenerationKwh / targetMonthlyGenerationKwh) * 100;
  const selectedKitEnergyBalanceKwh = selectedKitEstimatedMonthlyGenerationKwh == null
    ? null
    : selectedKitEstimatedMonthlyGenerationKwh - targetMonthlyGenerationKwh;
  const selectedKitIsAdequate = selectedKitPowerKwp == null
    ? null
    : selectedKitPowerKwp >= requiredPowerKwp;

  return {
    annualConsumptionKwh: round(annualConsumptionKwh),
    averageMonthlyConsumptionKwh: round(averageMonthlyConsumptionKwh),
    availabilityConsumptionKwh,
    compensableMonthlyConsumptionKwh: round(compensableMonthlyConsumptionKwh),
    compensableDailyConsumptionKwh: round(compensableDailyConsumptionKwh, 3),
    generationIncreasePercent: round(generationIncreasePercent),
    targetMonthlyGenerationKwh: round(targetMonthlyGenerationKwh),
    targetDailyGenerationKwh: truncate(targetDailyGenerationKwh, 2),
    basePerformanceRatio: round(basePerformanceRatio, 4),
    roofOrientationFactor: round(roofOrientationFactor, 4),
    performanceRatio: round(performanceRatio, 4),
    effectivePerformanceRatioPercent: round(performanceRatio * 100, 2),
    requiredPowerKwp: round(requiredPowerKwp, 3),
    selectedKitPowerKwp: selectedKitPowerKwp == null ? null : round(selectedKitPowerKwp, 3),
    selectedKitEstimatedMonthlyGenerationKwh:
      selectedKitEstimatedMonthlyGenerationKwh == null
        ? null
        : round(selectedKitEstimatedMonthlyGenerationKwh),
    selectedKitCoveragePercent:
      selectedKitCoveragePercent == null ? null : round(selectedKitCoveragePercent),
    selectedKitEnergyBalanceKwh:
      selectedKitEnergyBalanceKwh == null ? null : round(selectedKitEnergyBalanceKwh),
    selectedKitIsAdequate,
  };
}
