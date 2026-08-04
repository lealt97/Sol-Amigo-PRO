import React from 'react';
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Proposal } from '../../../types/proposal';
import { usePdfTheme } from '../pdfTheme';

interface TimelineTallPageProps {
  proposal: Proposal;
  pageNumber: number;
  illustration: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingTop: 42,
    paddingHorizontal: 36,
    paddingBottom: 32,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    flexDirection: 'row',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    maxWidth: 460,
    fontSize: 21,
    lineHeight: 1.08,
    fontWeight: 700,
  },
  number: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  artStage: {
    position: 'relative',
    width: '100%',
    height: 475,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  artImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  stepsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 9,
  },
  stepItem: {
    width: '19%',
    alignItems: 'center',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  stepCard: {
    width: '100%',
    minHeight: 31,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    width: '100%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export function TimelineTallPage({
  proposal,
  pageNumber,
  illustration,
}: TimelineTallPageProps) {
  const theme = usePdfTheme();
  const steps = [
    ['01', 'Planejamento'],
    ['02', 'Homologação'],
    ['03', 'Entrega'],
    ['04', 'Instalação'],
    ['05', 'Ativação'],
  ];

  return (
    <Page size="A4" style={[styles.page, { color: theme.text }]} wrap={false}>
      <View style={styles.top}>
        <View style={{ flex: 1, backgroundColor: theme.primary }} />
        <View style={{ flex: 1, backgroundColor: theme.secondary }} />
        <View style={{ flex: 1, backgroundColor: theme.accent }} />
      </View>

      <View style={styles.head}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.secondary }]}>Do aceite à geração</Text>
          <Text style={[styles.title, { color: theme.text }]}>Um processo organizado, transparente e acompanhado</Text>
        </View>
        <View style={[styles.number, { backgroundColor: theme.primarySoft }]}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: theme.primary }}>
            {String(pageNumber).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.artStage,
            {
              borderColor: theme.border,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <Image src={illustration} style={styles.artImage} />
        </View>

        <View style={styles.stepsRow}>
          {steps.map(([number, label], index) => {
            const color = index % 3 === 0
              ? theme.primary
              : index % 3 === 1
                ? theme.secondary
                : theme.accent;
            const soft = index % 3 === 0
              ? theme.primarySoft
              : index % 3 === 1
                ? theme.secondarySoft
                : theme.accentSoft;

            return (
              <View key={label} style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: color }]}>
                  <Text
                    style={{
                      color: index === 1 ? theme.text : '#ffffff',
                      fontSize: 7,
                      fontWeight: 700,
                    }}
                  >
                    {number}
                  </Text>
                </View>
                <View style={[styles.stepCard, { backgroundColor: soft }]}>
                  <Text
                    style={{
                      fontSize: 7.2,
                      lineHeight: 1.15,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: theme.text,
                    }}
                  >
                    {label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.note, { backgroundColor: theme.secondarySoft }]}>
          <Text style={{ fontSize: 7.4, lineHeight: 1.35, textAlign: 'center', color: theme.text }}>
            O cliente recebe orientações em cada etapa e é informado sobre prazos e dependências da distribuidora.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { color: theme.muted }]} fixed>
        <Text>Proposta fotovoltaica • {proposal.client?.name || 'Cliente'}</Text>
        <Text>{proposal.profile?.company_name || 'Sol Amigo PRO'}</Text>
      </View>
    </Page>
  );
}
