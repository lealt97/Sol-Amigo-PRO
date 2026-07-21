import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#18181b',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 5,
  },
  notice: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 12,
    marginBottom: 18,
  },
  noticeTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#78350f',
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#f4f4f5',
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
    borderLeft: '4px solid #3b82f6',
  },
  cardLabel: {
    fontSize: 10,
    color: '#71717a',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#18181b',
  },
  summaryText: {
    fontSize: 11,
    color: '#3f3f46',
    lineHeight: 1.5,
    marginTop: 12,
  },
});

const formatStoredNumber = (value: number | null | undefined, suffix: string) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Não disponível';
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${suffix}`;
};

const formatStoredMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Não disponível';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const ExecutiveSummary = ({ proposal }: { proposal: Proposal }) => {
  const solar = proposal.solar;

  return (
    <View>
      <Text style={styles.sectionTitle}>Resumo do Registro Histórico</Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Valores preservados sem recálculo</Text>
        <Text style={styles.noticeText}>
          O gerador e os mecanismos de cálculo foram removidos. Os campos abaixo, quando presentes, são somente valores anteriormente armazenados e não foram verificados ou recalculados por esta versão do sistema.
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Cliente</Text>
          <Text style={styles.cardValue}>{proposal.client?.name || 'Não disponível'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Código</Text>
          <Text style={styles.cardValue}>{proposal.code || 'Não disponível'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Potência armazenada</Text>
          <Text style={styles.cardValue}>{formatStoredNumber(solar?.installed_power_kwp, 'kWp')}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Geração mensal armazenada</Text>
          <Text style={styles.cardValue}>{formatStoredNumber(solar?.estimated_monthly_generation_kwh, 'kWh')}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Valor final armazenado</Text>
          <Text style={styles.cardValue}>{formatStoredMoney(proposal.final_price)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status</Text>
          <Text style={styles.cardValue}>{proposal.status || 'Não disponível'}</Text>
        </View>
      </View>

      <Text style={styles.summaryText}>
        Este documento não deve ser usado como validação técnica, econômica ou financeira. Revise os valores históricos com metodologia e responsáveis técnicos adequados antes de qualquer uso comercial.
      </Text>
    </View>
  );
};
