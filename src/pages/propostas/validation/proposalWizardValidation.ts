import { calcularConsumoDiarioTotal, calcularConsumoMensalEstimado } from '../../../lib/calculations/loadSurvey';
import { calcularPayback } from '../../../lib/calculations/payback';
import { calcularPrecoProposta } from '../../../lib/calculations/pricing';
import { calcularSistemaSolar } from '../../../lib/calculations/solar';
import { ProposalFormValues } from '../../../lib/validations/proposal.schema';

type StepValidationResult = {
  isValid: boolean;
  message?: string;
  stepIndex?: number;
  updates?: Partial<ProposalFormValues>;
};

const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

const toNumber = (value: unknown): number => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasPositive = (value: unknown) => toNumber(value) > 0;

const isNegativeWhenFilled = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return false;
  return toNumber(value) < 0;
};

const hasFilledValue = (value: unknown) => value !== '' && value !== null && value !== undefined;

function getAdditionalCostsTotal(values: Partial<ProposalFormValues>): number {
  const additionalCosts = values.additional_costs || [];
  return additionalCosts.reduce((sum, cost) => sum + Math.max(0, toNumber(cost.amount)), 0);
}

function getOtherCostsForPricing(values: Partial<ProposalFormValues>): number {
  const additionalCostsTotal = getAdditionalCostsTotal(values);
  return additionalCostsTotal > 0 ? additionalCostsTotal : toNumber(values.other_costs);
}

function resolveConsumptionAndEnergy(values: ProposalFormValues): StepValidationResult {
  const source = values.consumption_source || 'average';
  const updates: Partial<ProposalFormValues> = {};

  let consumption = toNumber(values.monthly_consumption_kwh);
  let billAmount = toNumber(values.bill_amount);
  let energyTariff = toNumber(values.energy_tariff);

  if (source === 'historical') {
    const historyValues = (values.history || []).map(toNumber).filter((value) => value > 0);

    if (historyValues.length === 0) {
      return {
        isValid: false,
        stepIndex: 1,
        message: 'Informe pelo menos um mês válido no histórico de consumo.',
      };
    }

    const average = historyValues.reduce((sum, value) => sum + value, 0) / historyValues.length;
    consumption = average;
    updates.monthly_consumption_kwh = round(average, 2);
  }

  if (source === 'load_survey') {
    const loads = values.loads || [];

    if (loads.length === 0) {
      return {
        isValid: false,
        stepIndex: 1,
        message: 'Adicione pelo menos um equipamento no levantamento de cargas.',
      };
    }

    const invalidLoad = loads.find((load) => {
      const hasName = String(load.equipment_name || '').trim().length > 0;
      return !hasName || !hasPositive(load.power_watts) || !hasPositive(load.quantity) || !hasPositive(load.hours_per_day);
    });

    if (invalidLoad) {
      return {
        isValid: false,
        stepIndex: 1,
        message: 'Preencha nome, potência, quantidade e horas por dia de todos os equipamentos.',
      };
    }

    const dailyConsumption = calcularConsumoDiarioTotal(loads as any[]);
    const monthlyConsumption = calcularConsumoMensalEstimado(dailyConsumption);

    consumption = monthlyConsumption;
    updates.estimated_daily_consumption = round(dailyConsumption, 2);
    updates.monthly_consumption_kwh = round(monthlyConsumption, 2);
  }

  const hasConsumption = consumption > 0;
  const hasBillAmount = billAmount > 0;
  const hasEnergyTariff = energyTariff > 0;

  if (!((hasConsumption && hasEnergyTariff) || (hasConsumption && hasBillAmount) || (hasBillAmount && hasEnergyTariff))) {
    return {
      isValid: false,
      stepIndex: 1,
      message: 'Informe uma combinação válida: consumo + tarifa, consumo + valor da conta, ou valor da conta + tarifa.',
    };
  }

  if (!hasConsumption && hasBillAmount && hasEnergyTariff) {
    consumption = billAmount / energyTariff;
    updates.monthly_consumption_kwh = round(consumption, 2);
  }

  if (!hasEnergyTariff && consumption > 0 && hasBillAmount) {
    energyTariff = billAmount / consumption;
    updates.energy_tariff = round(energyTariff, 4);
  }

  if (!hasBillAmount && consumption > 0 && energyTariff > 0) {
    billAmount = consumption * energyTariff;
    updates.bill_amount = round(billAmount, 2);
  }

  if (consumption <= 0 || energyTariff <= 0) {
    return {
      isValid: false,
      stepIndex: 1,
      message: 'Não foi possível calcular consumo e tarifa. Revise os dados da conta de energia.',
    };
  }

  return { isValid: true, updates };
}

function validateClientStep(values: ProposalFormValues): StepValidationResult {
  if (!values.client_id) {
    return {
      isValid: false,
      stepIndex: 0,
      message: 'Selecione um cliente antes de continuar.',
    };
  }

  return { isValid: true };
}

function validateConsumptionStep(values: ProposalFormValues): StepValidationResult {
  return resolveConsumptionAndEnergy(values);
}

function validateProjectStep(values: ProposalFormValues): StepValidationResult {
  if (!hasPositive(values.hsp)) {
    return { isValid: false, stepIndex: 2, message: 'Informe a irradiação solar HSP.' };
  }

  if (!hasPositive(values.panel_power_w)) {
    return { isValid: false, stepIndex: 2, message: 'Informe a potência do módulo em W.' };
  }

  const yieldFactor = toNumber(values.yield_factor);
  if (yieldFactor <= 0 || yieldFactor > 1) {
    return { isValid: false, stepIndex: 2, message: 'Informe um fator de rendimento entre 0 e 1. Exemplo: 0.80.' };
  }

  const generationTarget = toNumber(values.generation_target_percent);
  if (generationTarget <= 0 || generationTarget > 200) {
    return { isValid: false, stepIndex: 2, message: 'Informe uma meta de geração entre 1% e 200%.' };
  }

  const oversizing = toNumber(values.oversizing);
  if (oversizing <= 0 || oversizing > 2.5) {
    return { isValid: false, stepIndex: 2, message: 'Informe um oversizing DC/AC válido. Exemplo: 1.20.' };
  }

  return { isValid: true };
}

function validateCostsStep(values: ProposalFormValues): StepValidationResult {
  const costFields: Array<keyof ProposalFormValues> = [
    'kit_cost',
    'labor_cost',
    'fixed_costs',
    'freight_cost',
    'taxes',
    'commission',
    'other_costs',
  ];

  const hasNegativeCost = costFields.some((field) => isNegativeWhenFilled(values[field]));
  if (hasNegativeCost) {
    return { isValid: false, stepIndex: 3, message: 'Os custos da proposta não podem ser negativos.' };
  }

  const additionalCosts = values.additional_costs || [];
  const hasNegativeAdditionalCost = additionalCosts.some((cost) => isNegativeWhenFilled(cost.amount));
  if (hasNegativeAdditionalCost) {
    return { isValid: false, stepIndex: 3, message: 'Os custos adicionais não podem ter valor negativo.' };
  }

  const invalidAdditionalCost = additionalCosts.find((cost) => {
    const description = String(cost.description || '').trim();
    const hasDescription = description.length > 0;
    const hasAmount = hasFilledValue(cost.amount);

    if (!hasDescription && !hasAmount) return false;
    return !hasDescription || !hasPositive(cost.amount);
  });

  if (invalidAdditionalCost) {
    return {
      isValid: false,
      stepIndex: 3,
      message: 'Preencha descrição e valor maior que zero para cada custo adicional, ou remova a linha vazia.',
    };
  }

  if (!hasPositive(values.kit_cost)) {
    return { isValid: false, stepIndex: 3, message: 'Informe o custo do kit para calcular o investimento.' };
  }

  const margin = toNumber(values.margin_percentage);
  if (margin < 0 || margin >= 100) {
    return { isValid: false, stepIndex: 3, message: 'Informe uma margem maior ou igual a 0 e menor que 100%.' };
  }

  const discount = toNumber(values.discount_percentage);
  if (discount < 0 || discount > 100) {
    return { isValid: false, stepIndex: 3, message: 'Informe um desconto entre 0% e 100%.' };
  }

  const additionalCostsTotal = getAdditionalCostsTotal(values);
  const updates: Partial<ProposalFormValues> = {
    other_costs: additionalCostsTotal > 0 ? round(additionalCostsTotal, 2) : values.other_costs || '',
  };

  return { isValid: true, updates };
}

function validateFinancialStep(values: ProposalFormValues): StepValidationResult {
  const energyValidation = resolveConsumptionAndEnergy(values);
  if (!energyValidation.isValid) return energyValidation;

  const solarCalculation = calcularSistemaSolar({
    hsp: toNumber(values.hsp),
    panel_power_w: toNumber(values.panel_power_w),
    yield_factor: toNumber(values.yield_factor) || 0.80,
    generation_target_percent: toNumber(values.generation_target_percent) || 100,
    oversizing: toNumber(values.oversizing) || 1.20,
    monthly_consumption_kwh: toNumber(values.monthly_consumption_kwh) || toNumber(energyValidation.updates?.monthly_consumption_kwh) || undefined,
    current_bill_value: toNumber(values.bill_amount) || toNumber(energyValidation.updates?.bill_amount) || undefined,
    energy_tariff: toNumber(values.energy_tariff) || toNumber(energyValidation.updates?.energy_tariff) || undefined,
  });

  if (!solarCalculation) {
    return { isValid: false, stepIndex: 2, message: 'Complete o dimensionamento solar antes de avançar.' };
  }

  const pricing = calcularPrecoProposta({
    kit_cost: toNumber(values.kit_cost),
    labor_cost: toNumber(values.labor_cost),
    fixed_costs: toNumber(values.fixed_costs),
    freight_cost: toNumber(values.freight_cost),
    taxes: toNumber(values.taxes),
    commission: toNumber(values.commission),
    other_costs: getOtherCostsForPricing(values),
    margin_percentage: toNumber(values.margin_percentage),
    discount_percentage: toNumber(values.discount_percentage),
  });

  if (pricing.final_price <= 0) {
    return { isValid: false, stepIndex: 3, message: 'Complete os custos para calcular o preço final da proposta.' };
  }

  const payback = calcularPayback({
    investimentoTotal: pricing.final_price,
    economiaMensal: solarCalculation.monthly_savings,
    economiaAnual: solarCalculation.annual_savings,
  });

  if (!payback) {
    return { isValid: false, stepIndex: 4, message: 'Não foi possível calcular o payback. Revise tarifa, consumo, geração e investimento.' };
  }

  return {
    isValid: true,
    updates: {
      ...energyValidation.updates,
      other_costs: round(getOtherCostsForPricing(values), 2),
    },
  };
}

export function validateProposalStep(stepIndex: number, values: ProposalFormValues): StepValidationResult {
  switch (stepIndex) {
    case 0:
      return validateClientStep(values);
    case 1:
      return validateConsumptionStep(values);
    case 2:
      return validateProjectStep(values);
    case 3:
      return validateCostsStep(values);
    case 4:
      return validateFinancialStep(values);
    case 5:
      return validateFullProposal(values);
    default:
      return { isValid: true };
  }
}

export function validateFullProposal(values: ProposalFormValues): StepValidationResult {
  const validations = [
    validateClientStep(values),
    validateConsumptionStep(values),
    validateProjectStep(values),
    validateCostsStep(values),
    validateFinancialStep(values),
  ];

  const updates: Partial<ProposalFormValues> = {};

  for (const validation of validations) {
    if (!validation.isValid) return validation;
    Object.assign(updates, validation.updates || {});
  }

  return { isValid: true, updates };
}
