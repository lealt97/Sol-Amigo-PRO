import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { extractActiveLogo } from '../../../utils/logoHelper';
import { fitTextWithinBox } from '../../../lib/pdf/textLayout';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
  whitePatch: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  textSmall: {
    position: 'absolute',
    fontSize: 9,
    color: '#27272a',
    fontWeight: 'bold',
  },
  textMedium: {
    position: 'absolute',
    fontSize: 12,
    color: '#18181b',
    fontWeight: 'bold',
  },
  textPower: {
    position: 'absolute',
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
  },
  validity: {
    position: 'absolute',
    fontSize: 8,
    color: '#52525b',
  },
  logoPatch: {
    position: 'absolute',
    left: 278,
    top: 70,
    width: 260,
    height: 90,
    backgroundColor: '#ffffff',
  },
  logo: {
    position: 'absolute',
    left: 288,
    top: 75,
    width: 220,
    height: 70,
    objectFit: 'contain',
  },
  companyName: {
    position: 'absolute',
    left: 292,
    top: 82,
    width: 230,
    fontSize: 17,
    lineHeight: 21,
    color: '#18181b',
    fontWeight: 'bold',
    textAlign: 'left',
  },
});

const formatDate = (date?: string | null) => {
  const parsed = date ? new Date(date) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date().toLocaleDateString('pt-BR');
  return parsed.toLocaleDateString('pt-BR');
};

const formatPower = (proposal: Proposal) => {
  const installedPower = proposal.solar?.installed_power_kwp;
  const kitPower = proposal.solar_kit_snapshot?.kit_power_kwp;
  const power = installedPower && installedPower > 0 ? installedPower : kitPower;
  return power && power > 0 ? `${Number(power).toFixed(2)} kWp` : '0.00 kWp';
};

const getCityState = (proposal: Proposal) => {
  const city = proposal.client?.city?.trim();
  const state = proposal.client?.state?.trim();
  if (city && state) return `${city} - ${state}`;
  if (city) return city;
  if (state) return state;
  return 'Cidade - Estado';
};

const getValidityText = (proposal: Proposal) => {
  const days = proposal.profile?.default_validity_days || 7;
  return `validade: ${days} dias`;
};

export function DynamicCoverOverlay({ proposal }: { proposal: Proposal }) {
  const logoUrl = extractActiveLogo(proposal.profile?.logo_url || null);
  const companyName = proposal.profile?.company_name || 'Empresa de Energia Solar';
  const clientName = proposal.client?.name || 'Cliente';
  const cityState = getCityState(proposal);

  const companyLayout = fitTextWithinBox(companyName, {
    width: 230,
    height: 70,
    maxFontSize: 17,
    minFontSize: 7,
    maxLines: 3,
  });
  const clientLayout = fitTextWithinBox(clientName, {
    width: 230,
    height: 32,
    maxFontSize: 12,
    minFontSize: 5,
    maxLines: 2,
  });
  const locationLayout = fitTextWithinBox(cityState, {
    width: 112,
    height: 32,
    maxFontSize: 12,
    minFontSize: 5,
    maxLines: 2,
  });

  return (
    <View fixed style={styles.layer}>
      {/* Área superior reservada para logo/nome quando o template possuir esse espaço. */}
      {(logoUrl || companyName) && (
        <>
          <View style={styles.logoPatch} />
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
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
        </>
      )}

      {/* Cliente */}
      <View style={[styles.whitePatch, { left: 325, top: 462, width: 230, height: 34 }]} />
      <Text
        style={[
          styles.textMedium,
          {
            left: 325,
            top: 464,
            width: 230,
            fontSize: clientLayout.fontSize,
            lineHeight: clientLayout.lineHeight,
          },
        ]}
      >
        {clientLayout.lines.join('\n')}
      </Text>

      {/* Localização: a largura termina antes do bloco de potência. */}
      <View style={[styles.whitePatch, { left: 325, top: 526, width: 112, height: 34 }]} />
      <Text
        style={[
          styles.textMedium,
          {
            left: 325,
            top: 528,
            width: 112,
            fontSize: locationLayout.fontSize,
            lineHeight: locationLayout.lineHeight,
          },
        ]}
      >
        {locationLayout.lines.join('\n')}
      </Text>

      {/* Data e validade */}
      <View style={[styles.whitePatch, { left: 325, top: 595, width: 120, height: 28 }]} />
      <Text style={[styles.textSmall, { left: 325, top: 598, width: 120 }]}>{formatDate(proposal.created_at)}</Text>
      <Text style={[styles.validity, { left: 325, top: 613, width: 120 }]}>{getValidityText(proposal)}</Text>

      {/* Potência nominal */}
      <View style={[styles.whitePatch, { left: 444, top: 512, width: 120, height: 36 }]} />
      <Text style={[styles.textPower, { left: 444, top: 515, width: 120 }]}>{formatPower(proposal)}</Text>
    </View>
  );
}
