export type InverterDcLimitStatus =
  | 'within_manufacturer_limit'
  | 'above_manufacturer_limit'
  | 'documentation_pending';

export type InverterDcLimitInput = {
  dcPowerKwp: number;
  acPowerKw: number | null;
  maxPvInputPowerKwp: number | null;
  maxDcAcRatio: number | null;
};

export type InverterDcLimitResult = {
  status: InverterDcLimitStatus;
  statusLabel: string;
  guidance: string;
  dcPowerKwp: number;
  acPowerKw: number | null;
  maxPvInputPowerKwp: number | null;
  maxDcAcRatio: number | null;
  maxByRatioKwp: number | null;
  effectiveMaxDcPowerKwp: number | null;
};

const round = (value: number, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const positiveOrNull = (value: number | null) => (
  value != null && Number.isFinite(value) && value > 0 ? value : null
);

const format = (value: number) => value.toLocaleString('pt-BR', {
  maximumFractionDigits: 3,
});

export function evaluateInverterDcLimits(
  input: InverterDcLimitInput,
): InverterDcLimitResult {
  if (!Number.isFinite(input.dcPowerKwp) || input.dcPowerKwp <= 0) {
    throw new Error('A potência DC dos módulos deve ser maior que zero.');
  }

  const acPowerKw = positiveOrNull(input.acPowerKw);
  const maxPvInputPowerKwp = positiveOrNull(input.maxPvInputPowerKwp);
  const maxDcAcRatio = positiveOrNull(input.maxDcAcRatio);
  const maxByRatioKwp = acPowerKw != null && maxDcAcRatio != null
    ? acPowerKw * maxDcAcRatio
    : null;
  const availableLimits = [maxPvInputPowerKwp, maxByRatioKwp]
    .filter((value): value is number => value != null);
  const common = {
    dcPowerKwp: round(input.dcPowerKwp),
    acPowerKw: acPowerKw == null ? null : round(acPowerKw),
    maxPvInputPowerKwp: maxPvInputPowerKwp == null ? null : round(maxPvInputPowerKwp),
    maxDcAcRatio: maxDcAcRatio == null ? null : round(maxDcAcRatio),
    maxByRatioKwp: maxByRatioKwp == null ? null : round(maxByRatioKwp),
  };

  if (availableLimits.length === 0) {
    return {
      ...common,
      status: 'documentation_pending',
      statusLabel: 'Validação documental pendente',
      guidance: 'Cadastre a potência FV máxima ou a relação DC/AC máxima informada no datasheet do inversor. O percentual de oversizing, sozinho, não define incompatibilidade.',
      effectiveMaxDcPowerKwp: null,
    };
  }

  const effectiveMaxDcPowerKwp = Math.min(...availableLimits);
  if (input.dcPowerKwp > effectiveMaxDcPowerKwp + 1e-9) {
    return {
      ...common,
      status: 'above_manufacturer_limit',
      statusLabel: 'Acima do limite do fabricante',
      guidance: `A potência DC de ${format(input.dcPowerKwp)} kWp ultrapassa o limite efetivo de ${format(effectiveMaxDcPowerKwp)} kWp obtido dos dados cadastrados do inversor. Revise o conjunto ou o datasheet antes de continuar.`,
      effectiveMaxDcPowerKwp: round(effectiveMaxDcPowerKwp),
    };
  }

  return {
    ...common,
    status: 'within_manufacturer_limit',
    statusLabel: 'Dentro do limite do fabricante',
    guidance: `A potência DC de ${format(input.dcPowerKwp)} kWp está dentro do limite efetivo de ${format(effectiveMaxDcPowerKwp)} kWp informado para o modelo do inversor.`,
    effectiveMaxDcPowerKwp: round(effectiveMaxDcPowerKwp),
  };
}
