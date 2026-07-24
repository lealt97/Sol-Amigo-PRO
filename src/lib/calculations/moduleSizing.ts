export type ModuleSizingInput = {
  requiredPowerKwp: number;
  modulePowerW: number;
  moduleWidthM: number;
  moduleHeightM: number;
  roofWidthM: number;
  roofHeightM: number;
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

export function calculateModuleSizing(input: ModuleSizingInput): ModuleSizingResult {
  assertPositive(input.requiredPowerKwp, 'Potência necessária');
  assertPositive(input.modulePowerW, 'Potência do módulo');
  assertPositive(input.moduleWidthM, 'Largura do módulo');
  assertPositive(input.moduleHeightM, 'Altura do módulo');
  assertPositive(input.roofWidthM, 'Largura útil do telhado');
  assertPositive(input.roofHeightM, 'Altura útil do telhado');

  const moduleQuantity = Math.ceil((input.requiredPowerKwp * 1000) / input.modulePowerW);
  const installedPowerKwp = (moduleQuantity * input.modulePowerW) / 1000;
  const moduleAreaM2 = input.moduleWidthM * input.moduleHeightM;
  const totalModuleAreaM2 = moduleAreaM2 * moduleQuantity;
  const roofAreaM2 = input.roofWidthM * input.roofHeightM;
  const availableAreaBalanceM2 = roofAreaM2 - totalModuleAreaM2;

  return {
    moduleQuantity,
    installedPowerKwp: round(installedPowerKwp, 3),
    moduleAreaM2: round(moduleAreaM2, 3),
    totalModuleAreaM2: round(totalModuleAreaM2),
    roofAreaM2: round(roofAreaM2),
    availableAreaBalanceM2: round(availableAreaBalanceM2),
    modulesFitRoof: availableAreaBalanceM2 >= 0,
  };
}
