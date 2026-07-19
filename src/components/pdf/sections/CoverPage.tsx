import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { extractActiveLogo } from '../../../utils/logoHelper';
import { fitTextWithinBox } from '../../../lib/pdf/textLayout';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 60,
    backgroundColor: '#09090b',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoImage: {
    maxHeight: 40,
    maxWidth: 150,
    objectFit: 'contain',
  },
  companyName: {
    width: 300,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  titleContainer: {
    marginTop: 120,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 18,
    color: '#a1a1aa',
    marginBottom: 40,
  },
  clientBox: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderLeft: '4px solid #3b82f6',
    minHeight: 86,
  },
  clientLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    marginBottom: 5,
  },
  clientName: {
    fontSize: 20,
    lineHeight: 23,
    fontWeight: 'bold',
  },
  powerContainer: {
    marginTop: 40,
  },
  powerValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
  },
  powerLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid #27272a',
    paddingTop: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 10,
    color: '#71717a',
  },
});

export const CoverPage = ({ proposal }: { proposal: Proposal }) => {
  const date = new Date().toLocaleDateString('pt-BR');
  const logoUrl = extractActiveLogo(proposal.profile?.logo_url || null);
  const companyName = proposal.profile?.company_name || 'Empresa de Energia Solar';
  const clientName = proposal.client?.name || 'Cliente';

  const companyLayout = fitTextWithinBox(companyName, {
    width: 300,
    height: 62,
    maxFontSize: 24,
    minFontSize: 9,
    maxLines: 2,
  });
  const clientLayout = fitTextWithinBox(clientName, {
    width: 420,
    height: 48,
    maxFontSize: 20,
    minFontSize: 8,
    maxLines: 2,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {logoUrl ? (
          <Image src={logoUrl} style={styles.logoImage} />
        ) : (
          <Text
            style={[
              styles.companyName,
              { fontSize: companyLayout.fontSize, lineHeight: companyLayout.lineHeight },
            ]}
          >
            {companyLayout.lines.join('\n')}
          </Text>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Proposta Comercial</Text>
        <Text style={styles.subtitle}>Sistema Solar Fotovoltaico</Text>

        <View style={styles.clientBox}>
          <Text style={styles.clientLabel}>Preparado especialmente para</Text>
          <Text
            style={[
              styles.clientName,
              { fontSize: clientLayout.fontSize, lineHeight: clientLayout.lineHeight },
            ]}
          >
            {clientLayout.lines.join('\n')}
          </Text>
        </View>

        {proposal.solar?.installed_power_kwp && (
          <View style={styles.powerContainer}>
            <Text style={styles.powerValue}>{proposal.solar.installed_power_kwp.toFixed(2)} kWp</Text>
            <Text style={styles.powerLabel}>Potência do Sistema</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Gerado em: {date}</Text>
        <Text style={styles.footerText}>Proposta: #{proposal.code || proposal.id.substring(0, 8).toUpperCase()}</Text>
      </View>
    </View>
  );
};
