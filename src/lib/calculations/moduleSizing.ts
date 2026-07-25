export type ModuleSizingInput = {
  requiredPowerKwp: number;
  modulePowerW: number;
  moduleQuantity?: number | null;
  moduleWidthM: number;
  moduleHeightM: number;
  roofAreaM2: number;
};

export type ModuleSizingResult = {
  moduleQuantity: number;
  installedPowerKwp: number;
  moduleAreaM2: number;
  totalModuleAreaM2: number;
  roofAreaM2: number;
  availableAreaBalanceM2: number;
  modulesFitRoof: boolean;
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} deve ser maior que zero.`);
  }
};

export function calculateModuleQuantity(requiredPowerKwp: number, modulePowerW: number) {
  assertPositive(requiredPowerKwp, 'Potência necessária');
  assertPositive(modulePowerW, 'Potência do módulo');

  return Math.ceil((requiredPowerKwp * 1000) / modulePowerW);
}

export function calculateModuleSizing(input: ModuleSizingInput): ModuleSizingResult {
  assertPositive(input.modulePowerW, 'Potência do módulo');
  const moduleQuantity = input.moduleQuantity == null
    ? calculateModuleQuantity(input.requiredPowerKwp, input.modulePowerW)
    : Math.round(input.moduleQuantity);
  assertPositive(moduleQuantity, 'Quantidade de módulos');
  assertPositive(input.moduleWidthM, 'Largura do módulo');
  assertPositive(input.moduleHeightM, 'Altura do módulo');
  assertPositive(input.roofAreaM2, 'Área do telhado');

  const installedPowerKwp = (moduleQuantity * input.modulePowerW) / 1000;
  const moduleAreaM2 = input.moduleWidthM * input.moduleHeightM;
  const totalModuleAreaM2 = moduleAreaM2 * moduleQuantity;
  const availableAreaBalanceM2 = input.roofAreaM2 - totalModuleAreaM2;

  return {
    moduleQuantity,
    installedPowerKwp: round(installedPowerKwp, 3),
    moduleAreaM2: round(moduleAreaM2, 3),
    totalModuleAreaM2: round(totalModuleAreaM2),
    roofAreaM2: round(input.roofAreaM2),
    availableAreaBalanceM2: round(availableAreaBalanceM2),
    modulesFitRoof: availableAreaBalanceM2 >= 0,
  };
}
