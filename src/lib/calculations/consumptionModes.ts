export type ConsumptionMode = 'average' | 'history' | 'loads';

export const CONSUMPTION_MODE_LABELS: Record<ConsumptionMode, string> = {
  average: 'Consumo médio direto',
  history: 'Histórico de 12 meses',
  loads: 'Levantamento de cargas',
};

export type LoadSurveyInput = {
  equipmentName: string;
  powerWatts: number;
  quantity: number;
  hoursPerDay: number;
  daysPerWeek: number;
};

export type ConsumptionModeInput = {
  mode: ConsumptionMode;
  directAverageMonthlyKwh?: number;
  monthlyHistoryKwh?: number[];
  loads?: LoadSurveyInput[];
};

const assertFinite = (value: number, field: string) => {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} deve ser um número válido.`);
  }
};

export function calculateLoadDailyConsumptionKwh(load: LoadSurveyInput) {
  assertFinite(load.powerWatts, 'Potência do equipamento');
  assertFinite(load.quantity, 'Quantidade do equipamento');
  assertFinite(load.hoursPerDay, 'Horas de uso por dia');
  assertFinite(load.daysPerWeek, 'Dias de uso por semana');

  if (!load.equipmentName.trim()) {
    throw new Error('Informe o nome de todos os equipamentos do levantamento de cargas.');
  }
  if (load.powerWatts <= 0) {
    throw new Error(`A potência de ${load.equipmentName} deve ser maior que zero.`);
  }
  if (!Number.isInteger(load.quantity) || load.quantity <= 0) {
    throw new Error(`A quantidade de ${load.equipmentName} deve ser um número inteiro maior que zero.`);
  }
  if (load.hoursPerDay <= 0 || load.hoursPerDay > 24) {
    throw new Error(`As horas diárias de ${load.equipmentName} devem estar entre 0 e 24.`);
  }
  if (load.daysPerWeek <= 0 || load.daysPerWeek > 7) {
    throw new Error(`Os dias semanais de ${load.equipmentName} devem estar entre 1 e 7.`);
  }

  return (
    load.powerWatts
    * load.quantity
    * load.hoursPerDay
    * (load.daysPerWeek / 7)
  ) / 1000;
}

export function calculateLoadMonthlyConsumptionKwh(load: LoadSurveyInput) {
  return calculateLoadDailyConsumptionKwh(load) * 30;
}

export function calculateLoadSurveyMonthlyConsumptionKwh(loads: LoadSurveyInput[]) {
  if (loads.length === 0) {
    throw new Error('Adicione pelo menos um equipamento ao levantamento de cargas.');
  }

  return loads.reduce(
    (total, load) => total + calculateLoadMonthlyConsumptionKwh(load),
    0,
  );
}

export function resolveAverageMonthlyConsumptionKwh(input: ConsumptionModeInput) {
  if (input.mode === 'average') {
    const average = Number(input.directAverageMonthlyKwh);
    assertFinite(average, 'Consumo médio mensal');
    if (average <= 0) {
      throw new Error('O consumo médio mensal deve ser maior que zero.');
    }
    return average;
  }

  if (input.mode === 'history') {
    const history = input.monthlyHistoryKwh ?? [];
    if (history.length !== 12) {
      throw new Error('Informe o consumo dos 12 meses da conta de energia.');
    }

    history.forEach((consumption, index) => {
      assertFinite(consumption, `Consumo do mês ${index + 1}`);
      if (consumption < 0) {
        throw new Error(`O consumo do mês ${index + 1} não pode ser negativo.`);
      }
    });

    return history.reduce((total, consumption) => total + consumption, 0) / 12;
  }

  return calculateLoadSurveyMonthlyConsumptionKwh(input.loads ?? []);
}

export function buildMonthlyConsumptionSeries(input: ConsumptionModeInput) {
  const averageMonthlyKwh = resolveAverageMonthlyConsumptionKwh(input);
  return Array.from({ length: 12 }, () => averageMonthlyKwh);
}
