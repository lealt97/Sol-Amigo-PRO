import { SolarCalculationInput, SolarCalculationResult } from '../../types/solar';

export function calcularConsumoPorValorConta(valorConta: number, tarifaEnergia: number): number {
  if (tarifaEnergia <= 0) return 0;
  return valorConta / tarifaEnergia;
}

export function calcularTarifaEnergia(valorConta: number, consumoMensalFinal: number): number {
  if (consumoMensalFinal <= 0) return 0;
  return valorConta / consumoMensalFinal;
}

export function calcularConsumoMedio12Meses(consumos: number[]): number {
  const consumosValidos = consumos
    .slice(0, 12)
    .filter((consumo) => Number.isFinite(consumo) && consumo >= 0);

  if (!consumosValidos.length) return 0;

  const soma = consumosValidos.reduce((acc, valor) => acc + valor, 0);
  return soma / consumosValidos.length;
}

export function calcularConsumoProjetado(consumoMensalFinal: number, metaGeracao: number): number {
  return consumoMensalFinal * (metaGeracao / 100);
}

export function calcularPotenciaNecessaria(consumoProjetado: number, hsp: number, fatorRendimento: number): number {
  if (hsp <= 0 || fatorRendimento <= 0) return 0;
  return consumoProjetado / (hsp * 30 * fatorRendimento);
}

export function calcularQuantidadeModulos(potenciaNecessaria: number, potenciaModulo: number): number {
  if (potenciaModulo <= 0) return 0;
  return Math.ceil((potenciaNecessaria * 1000) / potenciaModulo);
}

export function calcularPotenciaInstalada(quantidadeModulos: number, potenciaModulo: number): number {
  return (quantidadeModulos * potenciaModulo) / 1000;
}

export function calcularGeracaoMensal(potenciaInstalada: number, hsp: number, fatorRendimento: number): number {
  return potenciaInstalada * hsp * 30 * fatorRendimento;
}

export function calcularExcedente(geracaoMensal: number, consumoMensalFinal: number): { kwh: number; percentual: number } {
  const kwh = geracaoMensal - consumoMensalFinal;
  const percentual = consumoMensalFinal > 0 ? kwh / consumoMensalFinal : 0;
  return { kwh, percentual };
}

export function calcularPotenciaMinimaInversor(potenciaInstalada: number, oversizing: number): number {
  if (oversizing <= 0) return 0;
  return potenciaInstalada / oversizing;
}

export function calcularEconomiaMensal(geracaoMensal: number, tarifaEnergia: number, consumoMensalFinal: number): number {
  const energiaCompensada = Math.min(geracaoMensal, consumoMensalFinal);
  return energiaCompensada * tarifaEnergia;
}

export function calcularEconomiaAnual(economiaMensal: number): number {
  return economiaMensal * 12;
}

export function calcularSistemaSolar(input: SolarCalculationInput): SolarCalculationResult | null {
  const {
    hsp,
    panel_power_w,
    yield_factor,
    generation_target_percent,
    oversizing,
  } = input;

  if (!hsp || !panel_power_w || !yield_factor || !generation_target_percent || !oversizing) {
    return null;
  }

  let consumoMensalFinal = input.monthly_consumption_kwh || 0;
  let tarifaEnergia = input.energy_tariff || 0;
  let valorConta = input.current_bill_value || 0;

  if (consumoMensalFinal > 0 && valorConta > 0 && !tarifaEnergia) {
    tarifaEnergia = calcularTarifaEnergia(valorConta, consumoMensalFinal);
  } else if (valorConta > 0 && tarifaEnergia > 0 && !consumoMensalFinal) {
    consumoMensalFinal = calcularConsumoPorValorConta(valorConta, tarifaEnergia);
  } else if (consumoMensalFinal > 0 && tarifaEnergia > 0 && !valorConta) {
    valorConta = consumoMensalFinal * tarifaEnergia;
  }

  const consumoProjetado = calcularConsumoProjetado(consumoMensalFinal, generation_target_percent);
  const potenciaNecessariaKwp = calcularPotenciaNecessaria(consumoProjetado, hsp, yield_factor);
  const quantidadeModulos = calcularQuantidadeModulos(potenciaNecessariaKwp, panel_power_w);
  const potenciaInstaladaKwp = calcularPotenciaInstalada(quantidadeModulos, panel_power_w);
  const geracaoMensalKwh = calcularGeracaoMensal(potenciaInstaladaKwp, hsp, yield_factor);
  const excedente = calcularExcedente(geracaoMensalKwh, consumoMensalFinal);
  const potenciaMinimaInversorKw = calcularPotenciaMinimaInversor(potenciaInstaladaKwp, oversizing);
  const economiaMensal = calcularEconomiaMensal(geracaoMensalKwh, tarifaEnergia, consumoMensalFinal);
  const economiaAnual = calcularEconomiaAnual(economiaMensal);

  return {
    monthly_consumption_kwh: consumoMensalFinal,
    projected_consumption_kwh: consumoProjetado,
    required_power_kwp: potenciaNecessariaKwp,
    panel_count: quantidadeModulos,
    installed_power_kwp: potenciaInstaladaKwp,
    estimated_monthly_generation_kwh: geracaoMensalKwh,
    excess_kwh: excedente.kwh,
    excess_percentage: excedente.percentual,
    min_inverter_power_kw: potenciaMinimaInversorKw,
    monthly_savings: economiaMensal,
    annual_savings: economiaAnual,
    energy_tariff: tarifaEnergia,
  };
}
