import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { classificarPayback } from '../../../lib/calculations/payback';

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#18181b',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 5,
  },
  paybackBox: {
    backgroundColor: '#ecfdf5', // emerald-50
    padding: 20,
    borderRadius: 8,
    borderLeft: '4px solid #10b981',
    marginBottom: 14,
  },
  paybackLabel: {
    fontSize: 12,
    color: '#059669', // emerald-600
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  paybackValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065f46', // emerald-800
  },
  viabilityBox: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    marginBottom: 20,
  },
  viabilityLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  viabilityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  viabilityDescription: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableRowHighlight: {
    margin: 'auto',
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
  },
  tableColHeader: {
    width: '33.33%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 8,
  },
  tableCol: {
    width: '33.33%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3f3f46',
  },
  tableCell: {
    fontSize: 10,
    color: '#52525b',
  },
  tableCellPositive: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
  },
  tableCellNegative: {
    fontSize: 10,
    color: '#ef4444',
  }
});

const formatMoney = (val: number | null | undefined) => {
  if (val === null || val === undefined) return 'N/A';
  return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const PaybackSection = ({ proposal }: { proposal: Proposal }) => {
  const solar = proposal.solar;

  if (!solar || !solar.payback_formatted) return null;

  const investimento = proposal.final_price || 0;
  const economiaAnual = solar.annual_savings || 0;
  const paybackDecimal = investimento > 0 && economiaAnual > 0 ? investimento / economiaAnual : null;
  const viability = classificarPayback(paybackDecimal);

  // Gerar dados simplificados para tabela
  // Mostrar anos: 1, 3, 5, payback, 10, 15, 20, 25
  const anosExibicao = [1, 3, 5, Math.ceil(solar.payback_years || 0), 10, 15, 20, 25]
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .sort((a, b) => a - b); // sort

  return (
    <View>
      <Text style={styles.sectionTitle}>Retorno Financeiro</Text>
      
      <View style={styles.paybackBox}>
        <Text style={styles.paybackLabel}>Tempo de Retorno (Payback Simples)</Text>
        <Text style={styles.paybackValue}>{solar.payback_formatted}</Text>
      </View>

      <View style={[styles.viabilityBox, { backgroundColor: viability.backgroundColor, borderColor: viability.borderColor }]}>
        <Text style={[styles.viabilityLabel, { color: viability.color }]}>Status do investimento</Text>
        <Text style={[styles.viabilityValue, { color: viability.color }]}>{viability.label}</Text>
        <Text style={[styles.viabilityDescription, { color: viability.color }]}>{viability.description}</Text>
      </View>

      <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#3f3f46' }}>
        Projeção de Retorno Acumulado
      </Text>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Ano</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Retorno Acumulado</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Saldo Líquido</Text></View>
        </View>

        {anosExibicao.map(ano => {
          if (ano <= 0 || ano > 25) return null;
          
          const retorno = economiaAnual * ano;
          const saldo = retorno - investimento;
          const isPayback = saldo >= 0 && (economiaAnual * (ano - 1) - investimento) < 0;

          return (
            <View style={isPayback ? styles.tableRowHighlight : styles.tableRow} key={ano}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Ano {ano}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{formatMoney(retorno)}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={saldo >= 0 ? styles.tableCellPositive : styles.tableCellNegative}>
                  {formatMoney(saldo)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
