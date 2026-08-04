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
    paddingTop: 46,
    paddingHorizontal: 42,
    paddingBottom: 34,
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
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  title: {
    maxWidth: 440,
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 700,
  },
  number: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  artColumn: {
    width: '61%',
    height: 592,
  },
  artStage: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  artInner: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  artImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  timelineColumn: {
    position: 'relative',
    width: '35%',
    height: 592,
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 22,
    bottom: 126,
    width: 2,
  },
  step: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepCard: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  note: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    padding: 11,
  },
  footer: {
    position: 'absolute',
    left: 42,
    right: 42,
    bottom: 18,
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
        <View style={styles.artColumn}>
          <View
            style={[
              styles.artStage,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: 90,
                right: -68,
                top: -74,
                backgroundColor: theme.primarySoft,
                opacity: 0.64,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 150,
                height: 150,
                borderRadius: 75,
                left: -56,
                bottom: -60,
                backgroundColor: theme.accentSoft,
                opacity: 0.7,
              }}
            />
            <View style={styles.artInner}>
              <Image src={illustration} style={styles.artImage} />
            </View>
          </View>
        </View>

        <View style={styles.timelineColumn}>
          <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
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
              <View key={label} style={styles.step}>
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
                  <Text style={{ fontSize: 8, fontWeight: 700, color: theme.text }}>{label}</Text>
                </View>
              </View>
            );
          })}

          <View style={[styles.note, { backgroundColor: theme.secondarySoft }]}>
            <Text style={{ fontSize: 7.6, lineHeight: 1.45, color: theme.text }}>
              O cliente recebe orientações em cada etapa e é informado sobre prazos e dependências da distribuidora.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { color: theme.muted }]} fixed>
        <Text>Proposta fotovoltaica • {proposal.client?.name || 'Cliente'}</Text>
        <Text>{proposal.profile?.company_name || 'Sol Amigo PRO'}</Text>
      </View>
    </Page>
  );
}
