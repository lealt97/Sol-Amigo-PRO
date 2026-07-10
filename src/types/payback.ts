export interface TabelaRetornoAno {
  ano: number;
  retorno: number;
  investimento: number;
  diferenca: number;
}

export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'not_viable';

export interface PaybackViability {
  status: PaybackStatus;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  description: string;
}

export interface PaybackCalculationInput {
  investimentoTotal: number;
  economiaMensal: number;
  economiaAnual: number;
}

export interface PaybackCalculationResult {
  paybackAnos: number;
  paybackMeses: number;
  paybackAnosDecimal: number;
  paybackFormatado: string;
  retorno25Anos: number;
  economiaAcumulada: number;
  economiaLiquida25Anos: number;
  viability: PaybackViability;
  tabelaRetorno: TabelaRetornoAno[];
}
