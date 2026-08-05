import React from 'react';
import {
  Circle,
  Image,
  Line,
  Page,
  Path,
  Polyline,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
import type { Proposal } from '../../../types/proposal';
import { SOLAR_SYSTEM_TYPE_LABELS } from '../../../types/solarKit';
import { usePdfTheme, type PdfDocumentTheme } from '../pdfTheme';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    paddingTop: 46,
    paddingHorizontal: 42,
    paddingBottom: 34,
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    flexDirection: 'row',
  },
  topBarSegment: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  title: {
    fontSize: 23,
    lineHeight: 1.08,
    fontWeight: 700,
    maxWidth: 430,
  },
  pageNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberText: {
    fontSize: 10,
    fontWeight: 700,
  },
  content: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    fontSize: 7,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  bodyText: {
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  smallText: {
    fontSize: 7.5,
    lineHeight: 1.45,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 35,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 7.5,
    lineHeight: 1.3,
    paddingRight: 6,
  },
  tableHeaderText: {
    fontSize: 6.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function getClientName(proposal: Proposal) {
  return proposal.client?.name || 'Cliente';
}

function getInstalledPower(proposal: Proposal) {
  return finite(proposal.solar?.installed_power_kwp || proposal.solar_kit_snapshot?.kit_power_kwp);
}

function getConsumptionAverage(proposal: Proposal) {
  return finite(
    proposal.solar?.monthly_consumption_kwh ||
      proposal.monthly_consumption_kwh ||
      proposal.solar?.projected_consumption_kwh,
  );
}

function getGenerationAverage(proposal: Proposal) {
  return finite(proposal.solar?.estimated_monthly_generation_kwh);
}

function getAnnualSavings(proposal: Proposal) {
  return finite(
    proposal.solar?.annual_savings ||
      finite(proposal.solar?.monthly_savings) * 12 ||
      finite(proposal.bill_amount) * 12 * 0.85,
  );
}

function getInvestment(proposal: Proposal) {
  return finite(proposal.final_price || proposal.gross_price || proposal.solar_kit_snapshot?.sale_price);
}

function getPaybackMonths(proposal: Proposal) {
  const years = finite(proposal.solar?.payback_years);
  const months = finite(proposal.solar?.payback_months);
  if (years || months) return Math.max(1, Math.round(years * 12 + months));

  const investment = getInvestment(proposal);
  const annualSavings = getAnnualSavings(proposal);
  return annualSavings > 0 ? Math.max(1, Math.round((investment / annualSavings) * 12)) : 60;
}

function getConsumptionSeries(proposal: Proposal) {
  const rawHistory = Array.isArray(proposal.history) ? proposal.history : [];
  const parsed = rawHistory
    .slice(0, 12)
    .map((item) => finite(String(item).replace('.', '').replace(',', '.')))
    .filter((item) => item > 0);
  const average = getConsumptionAverage(proposal) || 900;

  if (parsed.length === 12) return parsed;
  const factors = [0.95, 0.91, 0.94, 0.98, 1.03, 1.08, 1.11, 1.06, 1.01, 0.97, 0.94, 0.98];
  return factors.map((factor) => average * factor);
}

function getGenerationSeries(proposal: Proposal) {
  const average = getGenerationAverage(proposal) || getConsumptionAverage(proposal) || 900;
  const factors = [0.96, 0.91, 0.95, 1, 0.97, 0.9, 0.93, 1.02, 1.08, 1.1, 1.06, 1.02];
  return factors.map((factor) => average * factor);
}

function PageFrame({
  pageNumber,
  eyebrow,
  title,
  proposal,
  children,
}: {
  pageNumber: number;
  eyebrow: string;
  title: string;
  proposal: Proposal;
  children: React.ReactNode;
}) {
  const theme = usePdfTheme();

  return (
    <Page size="A4" style={[styles.page, { backgroundColor: '#FFFFFF', color: theme.text }]} wrap={false}>
      <View style={styles.topBar} fixed>
        <View style={[styles.topBarSegment, { backgroundColor: theme.primary }]} />
        <View style={[styles.topBarSegment, { backgroundColor: theme.secondary }]} />
        <View style={[styles.topBarSegment, { backgroundColor: theme.accent }]} />
      </View>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.secondary }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </View>
        <View style={[styles.pageNumber, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.pageNumberText, { color: theme.primary }]}>
            {String(pageNumber).padStart(2, '0')}
          </Text>
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      <View style={[styles.footer, { color: theme.muted }]} fixed>
        <Text>Proposta fotovoltaica • {getClientName(proposal)}</Text>
        <Text>{proposal.profile?.company_name || 'Sol Amigo PRO'}</Text>
      </View>
    </Page>
  );
}

function MetricCard({
  label,
  value,
  color,
  soft,
  theme,
  width,
}: {
  label: string;
  value: string;
  color: string;
  soft: string;
  theme: PdfDocumentTheme;
  width: number | string;
}) {
  return (
    <View style={[styles.card, { width, borderColor: theme.border, backgroundColor: soft }]}>
      <View style={{ width: 20, height: 5, borderRadius: 3, backgroundColor: color, marginBottom: 10 }} />
      <Text style={[styles.cardValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.cardTitle, { color: theme.muted, marginTop: 7, marginBottom: 0 }]}>{label}</Text>
    </View>
  );
}

function ConsultationArt({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <Svg viewBox="0 0 420 220" style={{ width: '100%', height: 220 }}>
      <Rect x="0" y="0" width="420" height="220" rx="28" fill={theme.surface} />
      <Circle cx="105" cy="68" r="31" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" />
      <Path d="M78 65c5-26 48-36 58-4-13-5-20-13-27-25-4 14-14 24-31 29Z" fill={theme.neutralSoft} stroke={theme.text} strokeWidth="4" />
      <Path d="M62 187c2-54 18-79 44-79 28 0 47 29 49 79" fill={theme.secondarySoft} stroke={theme.text} strokeWidth="4" />
      <Line x1="104" y1="111" x2="104" y2="187" stroke={theme.text} strokeWidth="4" />
      <Path d="M105 112l-16 21 16 13 17-13-17-21Z" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
      <Line x1="69" y1="134" x2="34" y2="114" stroke={theme.text} strokeWidth="5" />
      <Line x1="145" y1="137" x2="195" y2="110" stroke={theme.text} strokeWidth="5" />
      <Circle cx="318" cy="69" r="31" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" />
      <Path d="M291 59c12-25 46-25 57 3-8-4-15-7-24-7-13 0-24 4-33 12Z" fill={theme.primarySoft} stroke={theme.text} strokeWidth="4" />
      <Path d="M268 187c2-52 18-79 49-79 32 0 49 27 51 79" fill={theme.primary} stroke={theme.text} strokeWidth="4" />
      <Line x1="317" y1="111" x2="317" y2="187" stroke={theme.text} strokeWidth="4" />
      <Path d="M316 113l-15 20 15 13 16-13-16-20Z" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
      <Rect x="188" y="66" width="66" height="48" rx="8" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" />
      <Polyline points="199,101 211,87 222,95 241,71" fill="none" stroke={theme.primary} strokeWidth="5" />
      <Circle cx="242" cy="71" r="7" fill={theme.accent} />
    </Svg>
  );
}

function SolarHouseArt({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <Svg viewBox="0 0 420 255" style={{ width: '100%', height: 238 }}>
      <Rect width="420" height="255" rx="28" fill={theme.surface} />
      <Circle cx="337" cy="56" r="28" fill={theme.accent} />
      <Path d="M54 139 204 53l151 86v84H54Z" fill="#FFFFFF" stroke={theme.text} strokeWidth="5" />
      <Polyline points="77,130 204,57 330,130" fill="none" stroke={theme.primary} strokeWidth="12" />
      <Rect x="112" y="91" width="83" height="48" rx="4" fill={theme.primary} stroke={theme.text} strokeWidth="4" />
      <Rect x="210" y="91" width="83" height="48" rx="4" fill={theme.secondary} stroke={theme.text} strokeWidth="4" />
      <Line x1="139" y1="91" x2="139" y2="139" stroke={theme.primarySoft} strokeWidth="2" />
      <Line x1="167" y1="91" x2="167" y2="139" stroke={theme.primarySoft} strokeWidth="2" />
      <Line x1="112" y1="115" x2="195" y2="115" stroke={theme.primarySoft} strokeWidth="2" />
      <Line x1="237" y1="91" x2="237" y2="139" stroke={theme.secondarySoft} strokeWidth="2" />
      <Line x1="265" y1="91" x2="265" y2="139" stroke={theme.secondarySoft} strokeWidth="2" />
      <Line x1="210" y1="115" x2="293" y2="115" stroke={theme.secondarySoft} strokeWidth="2" />
      <Rect x="86" y="163" width="65" height="60" rx="5" fill={theme.primarySoft} stroke={theme.text} strokeWidth="4" />
      <Rect x="248" y="153" width="56" height="70" rx="5" fill={theme.secondarySoft} stroke={theme.text} strokeWidth="4" />
      <Circle cx="293" cy="190" r="4" fill={theme.accent} />
      <Path d="M357 159c21 12 27 25 22 39-7 19-33 25-55 8" fill="none" stroke={theme.secondary} strokeWidth="5" />
    </Svg>
  );
}

function GrowthArt({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <Svg viewBox="0 0 420 220" style={{ width: '100%', height: 210 }}>
      <Rect width="420" height="220" rx="28" fill={theme.surface} />
      <Line x1="54" y1="174" x2="372" y2="174" stroke={theme.border} strokeWidth="3" />
      <Rect x="81" y="133" width="42" height="41" rx="7" fill={theme.primarySoft} stroke={theme.primary} strokeWidth="4" />
      <Rect x="151" y="105" width="42" height="69" rx="7" fill={theme.secondarySoft} stroke={theme.secondary} strokeWidth="4" />
      <Rect x="221" y="75" width="42" height="99" rx="7" fill={theme.accentSoft} stroke={theme.accent} strokeWidth="4" />
      <Rect x="291" y="43" width="42" height="131" rx="7" fill={theme.primary} stroke={theme.text} strokeWidth="4" />
      <Path d="M79 126c67-4 121-25 176-69 31-25 62-28 88-28" fill="none" stroke={theme.text} strokeWidth="5" />
      <Path d="m334 20 15 9-12 12" fill="none" stroke={theme.text} strokeWidth="5" />
      <Circle cx="369" cy="58" r="24" fill={theme.accent} stroke={theme.text} strokeWidth="4" />
      <Line x1="369" y1="45" x2="369" y2="72" stroke={theme.onAccent} strokeWidth="3" />
    </Svg>
  );
}

export function IntroPage({ proposal, pageNumber, illustration }: { proposal: Proposal; pageNumber: number; illustration: string }) {
  const theme = usePdfTheme();
  const power = getInstalledPower(proposal);
  const generation = getGenerationAverage(proposal);
  const paybackMonths = getPaybackMonths(proposal);
  const savings25 = finite(proposal.solar?.net_savings_25_years || proposal.solar?.return_25_years) || getAnnualSavings(proposal) * 25;

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Uma decisão inteligente" title="Sua energia pode trabalhar a favor do seu patrimônio" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '49%' }}>
          <Text style={[styles.bodyText, { color: theme.muted, marginBottom: 18 }]}>
            Dimensionamos uma solução para reduzir a energia comprada da distribuidora, proteger o orçamento contra reajustes e gerar economia por muitos anos.
          </Text>
          <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
            <MetricCard theme={theme} width="48%" color={theme.primary} soft={theme.primarySoft} value={`${formatNumber(power, 2)} kWp`} label="Potência instalada" />
            <MetricCard theme={theme} width="48%" color={theme.secondary} soft={theme.secondarySoft} value={`${formatNumber(generation)} kWh`} label="Geração média/mês" />
            <View style={{ height: 10, width: '100%' }} />
            <MetricCard theme={theme} width="48%" color={theme.accent} soft={theme.accentSoft} value={`${Math.floor(paybackMonths / 12)}a ${paybackMonths % 12}m`} label="Retorno estimado" />
            <MetricCard theme={theme} width="48%" color={theme.primary} soft={theme.primarySoft} value={formatCurrency(savings25)} label="Economia em 25 anos" />
          </View>
        </View>
        <View style={{ width: '47%' }}>
          <View
  style={[
    styles.card,
    {
      height: 285,
      padding: 10,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  ]}
>
  <Image src={illustration} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
</View>
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.primary, marginTop: 14 }]}>
            <Text style={[styles.cardTitle, { color: theme.onPrimary }]}>Resultado esperado</Text>
            <Text style={[styles.bodyText, { color: theme.onPrimary }]}>
              Uma solução equilibrada entre geração, segurança técnica e retorno financeiro.
            </Text>
          </View>
        </View>
      </View>
    </PageFrame>
  );
}

export function ConsumptionPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const consumption = getConsumptionSeries(proposal);
  const generation = getGenerationSeries(proposal);
  const maxValue = Math.max(...consumption, ...generation, 1);
  const chartWidth = 500;
  const chartHeight = 205;
  const groupWidth = chartWidth / 12;

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Diagnóstico energético" title="Consumo atendido com menos dependência da rede" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
        <MetricCard theme={theme} width="31.5%" color={theme.primary} soft={theme.primarySoft} value={`${formatNumber(getConsumptionAverage(proposal))} kWh`} label="Consumo médio" />
        <MetricCard theme={theme} width="31.5%" color={theme.secondary} soft={theme.secondarySoft} value={`${formatNumber(getGenerationAverage(proposal))} kWh`} label="Geração estimada" />
        <MetricCard theme={theme} width="31.5%" color={theme.accent} soft={theme.accentSoft} value="Até 95%" label="Compensação projetada" />
      </View>

      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }]}>
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 3 }]}>Consumo x geração solar</Text>
            <Text style={[styles.smallText, { color: theme.muted }]}>Estimativa mensal em kWh</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.row, { alignItems: 'center', marginRight: 12 }]}>
              <View style={{ width: 8, height: 8, backgroundColor: theme.primary, marginRight: 4 }} />
              <Text style={[styles.smallText, { color: theme.muted }]}>Consumo</Text>
            </View>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <View style={{ width: 8, height: 8, backgroundColor: theme.accent, marginRight: 4 }} />
              <Text style={[styles.smallText, { color: theme.muted }]}>Geração</Text>
            </View>
          </View>
        </View>
        <Svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 220 }}>
          {[40, 80, 120, 160, 200].map((y) => (
            <Line key={y} x1="0" y1={y} x2={chartWidth} y2={y} stroke={theme.border} strokeWidth="1" />
          ))}
          {consumption.map((value, index) => {
            const barHeight = (value / maxValue) * 175;
            const generationHeight = (generation[index] / maxValue) * 175;
            const x = index * groupWidth + 5;
            return (
              <React.Fragment key={index}>
                <Rect x={x} y={200 - barHeight} width={groupWidth * 0.34} height={barHeight} rx="2" fill={theme.primary} />
                <Rect x={x + groupWidth * 0.38} y={200 - generationHeight} width={groupWidth * 0.34} height={generationHeight} rx="2" fill={theme.accent} />
              </React.Fragment>
            );
          })}
        </Svg>
        <View style={[styles.row, { justifyContent: 'space-around', marginTop: 2 }]}>
          {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((month) => (
            <Text key={month} style={{ width: 40, textAlign: 'center', fontSize: 6.2, color: theme.muted }}>{month}</Text>
          ))}
        </View>
      </View>

      <View style={[styles.card, { borderWidth: 0, borderLeftWidth: 4, borderLeftColor: theme.secondary, backgroundColor: theme.secondarySoft, marginTop: 16 }]}>
        <Text style={[styles.bodyText, { color: theme.text }]}>
          O consumo do imóvel continua sendo atendido. A diferença é que grande parte da energia passa a ser produzida no próprio local, reduzindo a energia comprada da distribuidora.
        </Text>
      </View>
    </PageFrame>
  );
}

export function TechnicalPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const kit = proposal.solar_kit_snapshot;
  const systemLabel = proposal.system_type ? SOLAR_SYSTEM_TYPE_LABELS[proposal.system_type] : 'On-grid';

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Engenharia e desempenho" title="Um sistema dimensionado para o perfil do seu imóvel" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '49%' }}>
          <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
            <MetricCard theme={theme} width="48%" color={theme.primary} soft={theme.primarySoft} value={`${kit?.module_quantity || proposal.solar?.panel_count || 0}`} label="Módulos" />
            <MetricCard theme={theme} width="48%" color={theme.secondary} soft={theme.secondarySoft} value={`${kit?.module_power_w || proposal.solar?.panel_power_w || 0} Wp`} label="Potência por módulo" />
            <View style={{ height: 10, width: '100%' }} />
            <MetricCard theme={theme} width="48%" color={theme.accent} soft={theme.accentSoft} value={`${formatNumber(kit?.inverter_power_kw || proposal.solar?.min_inverter_power_kw || 0, 1)} kW`} label="Inversor" />
            <MetricCard theme={theme} width="48%" color={theme.primary} soft={theme.primarySoft} value={systemLabel} label="Tipo de sistema" />
          </View>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.neutralSoft, marginTop: 14 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Premissas técnicas</Text>
            {['Irradiação solar local', 'Perdas técnicas e desempenho', 'Orientação e área do telhado', 'Histórico de consumo do cliente'].map((item) => (
              <View key={item} style={[styles.row, { alignItems: 'center', marginBottom: 8 }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.secondary, marginRight: 8 }} />
                <Text style={[styles.smallText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ width: '47%' }}>
          <SolarHouseArt theme={theme} />
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.primary, marginTop: 14 }]}>
            <Text style={[styles.cardTitle, { color: theme.onPrimary }]}>Projeto seguro</Text>
            <Text style={[styles.bodyText, { color: theme.onPrimary }]}>
              O posicionamento definitivo será validado na vistoria e no projeto executivo.
            </Text>
          </View>
        </View>
      </View>
    </PageFrame>
  );
}

export function KitPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const kit = proposal.solar_kit_snapshot;
  const rows = [
    ['Módulos fotovoltaicos', `${kit?.module_brand || 'Marca definida'} ${kit?.module_model || ''}`.trim(), `${kit?.module_quantity || 0} un.`, `${kit?.module_power_w || 0} Wp`],
    ['Inversor', `${kit?.inverter_brand || 'Marca definida'} ${kit?.inverter_model || ''}`.trim(), '1 un.', `${formatNumber(kit?.inverter_power_kw || 0, 1)} kW`],
    ['Estrutura de fixação', kit?.structure_type || 'Conforme telhado', '1 cj.', 'Completa'],
    ['Proteções CA e CC', 'String box, DPS e disjuntores', '1 cj.', 'Incluído'],
    ['Monitoramento', 'Aplicativo e portal do inversor', '1 un.', 'Incluído'],
    ['Cabeamento solar', 'Cabos e conectores compatíveis', '1 cj.', 'Incluído'],
  ];

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Equipamentos incluídos" title="Tecnologia selecionada para desempenho e durabilidade" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
        <MetricCard theme={theme} width="31.5%" color={theme.primary} soft={theme.primarySoft} value={`${kit?.module_quantity || 0} módulos`} label="Arranjo fotovoltaico" />
        <MetricCard theme={theme} width="31.5%" color={theme.secondary} soft={theme.secondarySoft} value={`${formatNumber(kit?.inverter_power_kw || 0, 1)} kW`} label="Potência do inversor" />
        <MetricCard theme={theme} width="31.5%" color={theme.accent} soft={theme.accentSoft} value="Kit completo" label="Instalação incluída" />
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden' }}>
        <View style={[styles.tableHeader, { backgroundColor: theme.primary }]}>
          <Text style={[styles.tableHeaderText, { width: '28%', color: theme.onPrimary }]}>Item</Text>
          <Text style={[styles.tableHeaderText, { width: '38%', color: theme.onPrimary }]}>Modelo / especificação</Text>
          <Text style={[styles.tableHeaderText, { width: '14%', color: theme.onPrimary }]}>Qtd.</Text>
          <Text style={[styles.tableHeaderText, { width: '20%', color: theme.onPrimary }]}>Detalhe</Text>
        </View>
        {rows.map((row, index) => (
          <View key={row[0]} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : theme.primarySoft }]}>
            <Text style={[styles.tableCell, { width: '28%', color: theme.text, fontWeight: 700 }]}>{row[0]}</Text>
            <Text style={[styles.tableCell, { width: '38%', color: theme.text }]}>{row[1]}</Text>
            <Text style={[styles.tableCell, { width: '14%', color: theme.text }]}>{row[2]}</Text>
            <Text style={[styles.tableCell, { width: '20%', color: theme.text }]}>{row[3]}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.accentSoft, marginTop: 16 }]}>
        <Text style={[styles.bodyText, { color: theme.text }]}>
          A relação final poderá receber ajustes equivalentes de marca ou modelo mediante disponibilidade, sem redução das especificações contratadas.
        </Text>
      </View>
    </PageFrame>
  );
}

export function RoofPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const roofImage = proposal.roof_image_url || proposal.roof_photo_url || proposal.roof_plan_image_url;

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Estudo visual" title="Uma prévia de como o sistema poderá ocupar o seu telhado" proposal={proposal}>
      <View style={{ height: 510, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
        {roofImage ? (
          <Image src={roofImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <SolarHouseArt theme={theme} />
        )}
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 15 }]}>
        <MetricCard theme={theme} width="48%" color={theme.primary} soft={theme.primarySoft} value={`${proposal.solar_kit_snapshot?.module_quantity || proposal.solar?.panel_count || 0} módulos`} label="Quantidade representada" />
        <MetricCard theme={theme} width="48%" color={theme.secondary} soft={theme.secondarySoft} value={`${formatNumber(proposal.roof_area_m2 || 0, 1)} m²`} label="Área informada" />
      </View>
      <View style={[styles.card, { borderWidth: 0, borderLeftWidth: 4, borderLeftColor: theme.accent, backgroundColor: theme.accentSoft, marginTop: 15 }]}>
        <Text style={[styles.smallText, { color: theme.text }]}>
          Imagem ilustrativa para apresentação comercial. O posicionamento final poderá ser ajustado após vistoria técnica, análise estrutural e projeto executivo.
        </Text>
      </View>
    </PageFrame>
  );
}

export function TimelinePage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const steps = [
    ['01', 'Aprovação', 'Formalização da contratação e envio dos documentos.'],
    ['02', 'Vistoria técnica', 'Validação do telhado, padrão elétrico e condições do local.'],
    ['03', 'Projeto executivo', 'Definição do arranjo, proteções e instalação.'],
    ['04', 'Homologação', 'Envio do processo para análise da distribuidora.'],
    ['05', 'Entrega', 'Separação e logística dos equipamentos.'],
    ['06', 'Instalação e ativação', 'Montagem, testes e configuração do monitoramento.'],
  ];

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Do aceite à geração" title="Um processo organizado, transparente e acompanhado" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '42%' }}>
          <ConsultationArt theme={theme} />
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.secondarySoft, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Acompanhamento</Text>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              O cliente recebe orientações durante cada etapa e é informado sobre dependências da distribuidora.
            </Text>
          </View>
        </View>
        <View style={{ width: '54%', position: 'relative' }}>
          <View style={{ position: 'absolute', left: 17, top: 22, bottom: 22, width: 3, backgroundColor: theme.primarySoft }} />
          {steps.map(([number, title, description], index) => {
            const stepColor = index % 3 === 0 ? theme.primary : index % 3 === 1 ? theme.secondary : theme.accent;
            const onColor = index % 3 === 2 ? theme.onAccent : '#FFFFFF';
            return (
              <View key={title} style={[styles.row, { alignItems: 'center', marginBottom: 13 }]}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: stepColor, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', marginRight: 10 }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: onColor }}>{number}</Text>
                </View>
                <View style={[styles.card, { flex: 1, padding: 11, borderColor: theme.border, backgroundColor: index % 2 ? theme.surface : '#FFFFFF' }]}>
                  <Text style={{ fontSize: 9, fontWeight: 700, color: theme.text, marginBottom: 3 }}>{title}</Text>
                  <Text style={[styles.smallText, { color: theme.muted }]}>{description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </PageFrame>
  );
}

export function FinancialPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const investment = getInvestment(proposal);
  const monthlySavings = finite(proposal.solar?.monthly_savings) || finite(proposal.bill_amount) * 0.85;
  const savings25 = finite(proposal.solar?.net_savings_25_years || proposal.solar?.return_25_years) || getAnnualSavings(proposal) * 25;

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Condição comercial" title="Um investimento que substitui uma despesa recorrente" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '49%' }}>
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.primary, padding: 22 }]}>
            <Text style={[styles.cardTitle, { color: theme.onPrimary }]}>Investimento total</Text>
            <Text style={{ fontSize: 31, fontWeight: 700, color: theme.onPrimary, marginVertical: 8 }}>{formatCurrency(investment)}</Text>
            <Text style={[styles.smallText, { color: theme.onPrimary }]}>Equipamentos, projeto, homologação e instalação incluídos conforme escopo.</Text>
          </View>
          <View style={[styles.row, { justifyContent: 'space-between', marginTop: 14 }]}>
            <MetricCard theme={theme} width="48%" color={theme.secondary} soft={theme.secondarySoft} value={`${formatCurrency(monthlySavings)}/mês`} label="Economia inicial" />
            <MetricCard theme={theme} width="48%" color={theme.accent} soft={theme.accentSoft} value={formatCurrency(savings25)} label="Economia em 25 anos" />
          </View>
          <View style={[styles.card, { borderColor: theme.border, marginTop: 14 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Condição comercial</Text>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View>
                <Text style={[styles.smallText, { color: theme.muted }]}>Entrada sugerida</Text>
                <Text style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginTop: 4 }}>{formatCurrency(investment * 0.2)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.smallText, { color: theme.muted }]}>Saldo</Text>
                <Text style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginTop: 4 }}>Conforme negociação</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ width: '47%' }}>
          <GrowthArt theme={theme} />
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.secondarySoft, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Comparação prática</Text>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              Sem o sistema, a conta continua sendo paga indefinidamente. Com o sistema, parte desse gasto se transforma em um ativo instalado no imóvel.
            </Text>
          </View>
        </View>
      </View>
    </PageFrame>
  );
}

export function PaybackPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const investment = getInvestment(proposal);
  const annualSavings = getAnnualSavings(proposal);
  const paybackMonths = getPaybackMonths(proposal);
  const paybackYears = paybackMonths / 12;
  const years = [0, 5, 10, 15, 20, 25];
  const values = years.map((year) => -investment + annualSavings * year);
  const minValue = Math.min(...values, -investment);
  const maxValue = Math.max(...values, annualSavings * 25 - investment, 1);
  const width = 480;
  const height = 215;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - minValue) / (maxValue - minValue || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');
  const zeroY = height - ((0 - minValue) / (maxValue - minValue || 1)) * height;

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Retorno do investimento" title="A economia acumulada supera o investimento e continua crescendo" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '61%' }}>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }]}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 3 }]}>Fluxo de caixa acumulado</Text>
                <Text style={[styles.smallText, { color: theme.muted }]}>Projeção de 25 anos</Text>
              </View>
              <View style={{ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9, backgroundColor: theme.accentSoft }}>
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: theme.onAccent }}>Payback: {Math.floor(paybackYears)}a {paybackMonths % 12}m</Text>
              </View>
            </View>
            <Svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 225 }}>
              {[35, 75, 115, 155, 195].map((y) => (
                <Line key={y} x1="0" y1={y} x2={width} y2={y} stroke={theme.border} strokeWidth="1" />
              ))}
              <Line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke={theme.secondary} strokeWidth="2" strokeDasharray="6 6" />
              <Polyline points={points} fill="none" stroke={theme.primary} strokeWidth="6" />
              <Circle cx={(paybackYears / 25) * width} cy={zeroY} r="8" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
            </Svg>
            <View style={[styles.row, { justifyContent: 'space-between', marginTop: 2 }]}>
              {years.map((year) => <Text key={year} style={{ fontSize: 6.4, color: theme.muted }}>{year} anos</Text>)}
            </View>
          </View>
          <View style={[styles.row, { justifyContent: 'space-between', marginTop: 14 }]}>
            <MetricCard theme={theme} width="31.5%" color={theme.primary} soft={theme.primarySoft} value={formatCurrency(Math.max(0, annualSavings * 10 - investment))} label="10 anos" />
            <MetricCard theme={theme} width="31.5%" color={theme.secondary} soft={theme.secondarySoft} value={formatCurrency(Math.max(0, annualSavings * 15 - investment))} label="15 anos" />
            <MetricCard theme={theme} width="31.5%" color={theme.accent} soft={theme.accentSoft} value={formatCurrency(Math.max(0, annualSavings * 25 - investment))} label="25 anos" />
          </View>
        </View>
        <View style={{ width: '35%' }}>
          <GrowthArt theme={theme} />
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.primary, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: theme.onPrimary }]}>Premissas transparentes</Text>
            <Text style={[styles.smallText, { color: theme.onPrimary }]}>
              Tarifa atual, reajustes projetados, degradação dos módulos, conta residual e manutenção prevista.
            </Text>
          </View>
        </View>
      </View>
    </PageFrame>
  );
}

export function AcceptancePage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {
  const theme = usePdfTheme();
  const company = proposal.profile?.company_name || 'Nossa empresa';
  const contact = proposal.profile?.seller_phone || proposal.client?.phone || 'Entre em contato com seu consultor';

  return (
    <PageFrame pageNumber={pageNumber} eyebrow="Próximo passo" title="Pronto para transformar sua conta de energia em economia?" proposal={proposal}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: '49%' }}>
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.primary, padding: 22 }]}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: theme.accent, marginBottom: 16 }} />
            <Text style={{ fontSize: 19, lineHeight: 1.18, fontWeight: 700, color: theme.onPrimary }}>
              Aprove esta proposta para iniciarmos a vistoria técnica e a preparação do seu projeto.
            </Text>
            <Text style={[styles.smallText, { color: theme.onPrimary, marginTop: 15 }]}>Validade da condição comercial conforme informado na proposta.</Text>
          </View>
          <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 }]}>
            {['Vistoria técnica', 'Projeto executivo', 'Homologação', 'Instalação completa'].map((item) => (
              <View key={item} style={[styles.card, { width: '48%', borderColor: theme.border, padding: 10, marginBottom: 10 }]}>
                <Text style={[styles.smallText, { color: theme.text, fontWeight: 700 }]}>✓ {item}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.card, { borderWidth: 0, backgroundColor: theme.accentSoft }]}> 
            <Text style={[styles.smallText, { color: theme.text }]}>{company} • {contact}</Text>
          </View>
        </View>
        <View style={{ width: '47%' }}>
          <ConsultationArt theme={theme} />
          <View style={[styles.card, { borderColor: theme.border, marginTop: 18, paddingTop: 28 }]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 7 }} />
            <Text style={[styles.smallText, { color: theme.muted, marginBottom: 24 }]}>Assinatura do cliente</Text>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ width: '47%' }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 7 }} />
                <Text style={[styles.smallText, { color: theme.muted }]}>Data</Text>
              </View>
              <View style={{ width: '47%' }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 7 }} />
                <Text style={[styles.smallText, { color: theme.muted }]}>Código da proposta</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </PageFrame>
  );
}
