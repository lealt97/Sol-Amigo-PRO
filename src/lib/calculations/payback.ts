import { PaybackCalculationInput, PaybackCalculationResult, PaybackViability, TabelaRetornoAno } from '../../types/payback';

export function classificarPayback(paybackAnosDecimal: number | null): PaybackViability {
  if (paybackAnosDecimal === null || !Number.isFinite(paybackAnosDecimal) || paybackAnosDecimal <= 0) {
    return {
      status: 'not_viable',
      label: 'Não viável',
      color: '#DC2626',
      backgroundColor: '#FEE2E2',
      borderColor: '#FCA5A5',
      description: 'O investimento não apresenta retorno financeiro viável com os dados informados.',
    };
  }

  if (paybackAnosDecimal <= 3) {
    return {
      status: 'excellent',
      label: 'Excelente',
      color: '#16A34A',
      backgroundColor: '#DCFCE7',
      borderColor: '#86EFAC',
      description: 'Retorno muito rápido. Proposta altamente atrativa.',
    };
  }

  if (paybackAnosDecimal <= 4.5) {
    return {
      status: 'very_good',
      label: 'Muito bom',
      color: '#65A30D',
      backgroundColor: '#ECFCCB',
      borderColor: '#BEF264',
      description: 'Retorno rápido e comercialmente muito interessante.',
    };
  }

  if (paybackAnosDecimal <= 6) {
    return {
      status: 'good',
      label: 'Bom',
      color: '#0076DD',
      backgroundColor: '#DBEAFE',
      borderColor: '#93C5FD',
      description: 'Retorno saudável e dentro de uma faixa aceitável para energia solar.',
    };
  }

  if (paybackAnosDecimal <= 8) {
    return {
      status: 'regular',
      label: 'Regular',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
      borderColor: '#FCD34D',
      description: 'Retorno mais demorado. Pode exigir ajuste de preço, kit ou condições comerciais.',
    };
  }

  return {
    status: 'not_viable',
    label: 'Não viável',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    description: 'Payback muito longo. O projeto não está atrativo nas condições atuais.',
  };
}

export function calcularPayback(input: PaybackCalculationInput): PaybackCalculationResult | null {
  const { investimentoTotal, economiaAnual } = input;

  if (economiaAnual <= 0 || investimentoTotal <= 0) {
    return null;
  }

  const paybackDecimal = investimentoTotal / economiaAnual;
  let paybackAnos = Math.floor(paybackDecimal);
  let paybackMeses = Math.round((paybackDecimal - paybackAnos) * 12);

  if (paybackMeses === 12) {
    paybackAnos += 1;
    paybackMeses = 0;
  }
  
  let paybackFormatado = '';
  if (paybackAnos > 0) {
    paybackFormatado += `${paybackAnos} ano${paybackAnos > 1 ? 's' : ''}`;
  }
  if (paybackMeses > 0) {
    if (paybackFormatado) paybackFormatado += ' e ';
    paybackFormatado += `${paybackMeses} mês${paybackMeses > 1 ? 'es' : ''}`;
  }
  if (!paybackFormatado) {
    paybackFormatado = 'Imediato';
  }

  const retorno25Anos = economiaAnual * 25;
  const economiaLiquida25Anos = retorno25Anos - investimentoTotal;

  const tabelaRetorno: TabelaRetornoAno[] = [];
  for (let ano = 0; ano <= 25; ano++) {
    const retornoAno = economiaAnual * ano;
    tabelaRetorno.push({
      ano,
      retorno: retornoAno,
      investimento: investimentoTotal,
      diferenca: retornoAno - investimentoTotal
    });
  }

  return {
    paybackAnos,
    paybackMeses,
    paybackAnosDecimal: paybackDecimal,
    paybackFormatado,
    retorno25Anos,
    economiaAcumulada: retorno25Anos,
    economiaLiquida25Anos,
    viability: classificarPayback(paybackDecimal),
    tabelaRetorno
  };
}
