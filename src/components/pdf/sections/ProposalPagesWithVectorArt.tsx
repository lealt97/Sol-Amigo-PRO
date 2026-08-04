import React from 'react';
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Proposal } from '../../../types/proposal';
import { usePdfTheme } from '../pdfTheme';

export { AcceptancePage, ConsumptionPage, IntroPage, RoofPage, TechnicalPage } from './ProposalPages';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#fff', paddingTop: 46, paddingHorizontal: 42, paddingBottom: 34 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 7, flexDirection: 'row' },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 1.7, textTransform: 'uppercase', marginBottom: 7 },
  title: { fontSize: 22, lineHeight: 1.1, fontWeight: 700, maxWidth: 440 },
  number: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 42, right: 42, bottom: 18, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row' },
  card: { borderWidth: 1, borderRadius: 13, padding: 12 },
  label: { fontSize: 6.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .7, marginBottom: 5 },
  value: { fontSize: 16, fontWeight: 700 },
  body: { fontSize: 8.5, lineHeight: 1.45 },
});

const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const num = (value: number, digits = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);
const investmentOf = (p: Proposal) => n(p.final_price || p.gross_price || p.solar_kit_snapshot?.sale_price);
const annualSavingsOf = (p: Proposal) => n(p.solar?.annual_savings || n(p.solar?.monthly_savings) * 12 || n(p.bill_amount) * 12 * .85);
const paybackOf = (p: Proposal) => {
  const stored = n(p.solar?.payback_years) * 12 + n(p.solar?.payback_months);
  return stored || Math.max(1, Math.round(investmentOf(p) / Math.max(annualSavingsOf(p), 1) * 12));
};

type IllustratedPageProps = {
  proposal: Proposal;
  pageNumber: number;
  illustration: string;
};

function Frame({ pageNumber, eyebrow, title, proposal, children }: { pageNumber: number; eyebrow: string; title: string; proposal: Proposal; children: React.ReactNode }) {
  const t = usePdfTheme();
  return <Page size="A4" style={[s.page, { color: t.text }]} wrap={false}>
    <View style={s.top}><View style={{ flex: 1, backgroundColor: t.primary }} /><View style={{ flex: 1, backgroundColor: t.secondary }} /><View style={{ flex: 1, backgroundColor: t.accent }} /></View>
    <View style={s.head}><View><Text style={[s.eyebrow, { color: t.secondary }]}>{eyebrow}</Text><Text style={[s.title, { color: t.text }]}>{title}</Text></View><View style={[s.number, { backgroundColor: t.primarySoft }]}><Text style={{ fontSize: 10, fontWeight: 700, color: t.primary }}>{String(pageNumber).padStart(2, '0')}</Text></View></View>
    <View style={{ flex: 1 }}>{children}</View>
    <View style={[s.footer, { color: t.muted }]} fixed><Text>Proposta fotovoltaica • {proposal.client?.name || 'Cliente'}</Text><Text>{proposal.profile?.company_name || 'Sol Amigo PRO'}</Text></View>
  </Page>;
}

function Art({ src, height }: { src: string; height: number }) {
  const t = usePdfTheme();
  return <View style={[s.card, { borderColor: t.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}><Image src={src} style={{ width: '100%', height, objectFit: 'contain' }} /></View>;
}

function Metric({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'secondary' | 'accent' }) {
  const t = usePdfTheme();
  const color = t[tone];
  const soft = t[`${tone}Soft` as 'primarySoft' | 'secondarySoft' | 'accentSoft'];
  return <View style={[s.card, { borderColor: t.border, backgroundColor: soft }]}><View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: color, marginBottom: 8 }} /><Text style={[s.value, { color: t.text }]}>{value}</Text><Text style={[s.label, { color: t.muted, marginTop: 6, marginBottom: 0 }]}>{label}</Text></View>;
}

export function KitPage({ proposal, pageNumber, illustration }: IllustratedPageProps) {
  const t = usePdfTheme(); const k = proposal.solar_kit_snapshot;
  const items = [
    ['Módulos', `${k?.module_quantity || 0} × ${k?.module_brand || 'marca definida'} ${k?.module_model || ''}`],
    ['Inversor', `${k?.inverter_brand || 'marca definida'} ${k?.inverter_model || ''} • ${num(n(k?.inverter_power_kw), 1)} kW`],
    ['Estrutura', k?.structure_type || 'Conforme o tipo de telhado'],
    ['Proteções e cabos', 'DPS, disjuntores, conectores e cabeamento compatível'],
    ['Monitoramento', 'Aplicativo e portal do fabricante do inversor'],
  ];
  return <Frame pageNumber={pageNumber} eyebrow="Equipamentos incluídos" title="Tecnologia selecionada para desempenho e durabilidade" proposal={proposal}>
    <View style={[s.row, { justifyContent: 'space-between', marginBottom: 14 }]}><View style={{ width: '39%' }}><Metric label="Arranjo fotovoltaico" value={`${k?.module_quantity || 0} módulos`} /><View style={{ height: 10 }} /><Metric label="Potência do inversor" value={`${num(n(k?.inverter_power_kw), 1)} kW`} tone="secondary" /></View><View style={{ width: '57%' }}><Art src={illustration} height={205} /></View></View>
    <View style={[s.card, { borderColor: t.border, padding: 0, overflow: 'hidden' }]}>{items.map(([label, value], i) => <View key={label} style={[s.row, { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: i % 2 ? t.primarySoft : '#fff' }]}><Text style={{ width: '27%', fontSize: 7.4, fontWeight: 700, color: t.text }}>{label}</Text><Text style={{ width: '73%', fontSize: 7.4, color: t.text }}>{value}</Text></View>)}</View>
    <View style={[s.card, { borderWidth: 0, backgroundColor: t.accentSoft, marginTop: 14 }]}><Text style={[s.body, { color: t.text }]}>A relação final poderá receber ajustes equivalentes de marca ou modelo conforme disponibilidade, sem redução das especificações contratadas.</Text></View>
  </Frame>;
}

export function TimelinePage({ proposal, pageNumber, illustration }: IllustratedPageProps) {
  const t = usePdfTheme();
  const steps = [['01','Planejamento'],['02','Homologação'],['03','Entrega'],['04','Instalação'],['05','Ativação']];
  return <Frame pageNumber={pageNumber} eyebrow="Do aceite à geração" title="Um processo organizado, transparente e acompanhado" proposal={proposal}>
    <Art src={illustration} height={345} />
    <View style={[s.row, { justifyContent: 'space-between', marginTop: 14 }]}>{steps.map(([number, label], i) => { const color = i % 3 === 0 ? t.primary : i % 3 === 1 ? t.secondary : t.accent; return <View key={label} style={{ width: '18.8%', alignItems: 'center' }}><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center', marginBottom: 7 }}><Text style={{ color: '#fff', fontSize: 7, fontWeight: 700 }}>{number}</Text></View><Text style={{ fontSize: 7.5, fontWeight: 700, color: t.text, textAlign: 'center' }}>{label}</Text></View>; })}</View>
    <View style={[s.card, { borderWidth: 0, backgroundColor: t.secondarySoft, marginTop: 18 }]}><Text style={[s.body, { color: t.text }]}>O cliente recebe orientações em cada etapa e é informado sobre prazos e dependências da distribuidora.</Text></View>
  </Frame>;
}

export function FinancialPage({ proposal, pageNumber, illustration }: IllustratedPageProps) {
  const t = usePdfTheme(); const investment = investmentOf(proposal); const monthly = n(proposal.solar?.monthly_savings) || n(proposal.bill_amount) * .85; const savings25 = n(proposal.solar?.net_savings_25_years || proposal.solar?.return_25_years) || annualSavingsOf(proposal) * 25;
  return <Frame pageNumber={pageNumber} eyebrow="Condição comercial" title="Um investimento que substitui uma despesa recorrente" proposal={proposal}>
    <View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ width: '43%' }}><View style={[s.card, { borderWidth: 0, backgroundColor: t.primary, padding: 20 }]}><Text style={[s.label, { color: t.onPrimary }]}>Investimento total</Text><Text style={{ fontSize: 29, fontWeight: 700, color: t.onPrimary, marginVertical: 8 }}>{money(investment)}</Text><Text style={[s.body, { color: t.onPrimary }]}>Equipamentos, projeto, homologação e instalação conforme o escopo comercial.</Text></View><View style={{ height: 12 }} /><Metric label="Economia inicial" value={`${money(monthly)}/mês`} tone="secondary" /><View style={{ height: 10 }} /><Metric label="Economia em 25 anos" value={money(savings25)} tone="accent" /></View><View style={{ width: '53%' }}><Art src={illustration} height={355} /><View style={[s.card, { borderWidth: 0, backgroundColor: t.accentSoft, marginTop: 12 }]}><Text style={[s.body, { color: t.text }]}>Parte do gasto recorrente com energia se transforma em um ativo instalado no imóvel e em economia acumulada.</Text></View></View></View>
  </Frame>;
}

export function PaybackPage({ proposal, pageNumber, illustration }: IllustratedPageProps) {
  const t = usePdfTheme(); const months = paybackOf(proposal); const annual = annualSavingsOf(proposal); const investment = investmentOf(proposal);
  return <Frame pageNumber={pageNumber} eyebrow="Retorno do investimento" title="A economia supera o investimento e continua crescendo" proposal={proposal}>
    <View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ width: '54%' }}><View style={[s.card, { borderWidth: 0, backgroundColor: t.primary, padding: 21 }]}><Text style={[s.label, { color: t.onPrimary }]}>Retorno estimado</Text><Text style={{ fontSize: 31, fontWeight: 700, color: t.onPrimary, marginVertical: 9 }}>{Math.floor(months / 12)} anos e {months % 12} meses</Text><Text style={[s.body, { color: t.onPrimary }]}>Estimativa calculada com tarifa, reajustes, degradação dos módulos, conta residual e manutenção prevista.</Text></View><View style={[s.row, { justifyContent: 'space-between', marginTop: 14 }]}><View style={{ width: '31.5%' }}><Metric label="10 anos" value={money(Math.max(0, annual * 10 - investment))} /></View><View style={{ width: '31.5%' }}><Metric label="15 anos" value={money(Math.max(0, annual * 15 - investment))} tone="secondary" /></View><View style={{ width: '31.5%' }}><Metric label="25 anos" value={money(Math.max(0, annual * 25 - investment))} tone="accent" /></View></View></View><View style={{ width: '42%' }}><Art src={illustration} height={300} /><View style={[s.card, { borderWidth: 0, backgroundColor: t.secondarySoft, marginTop: 12 }]}><Text style={[s.body, { color: t.text }]}>Após o payback, a economia líquida continua crescendo durante a vida útil do sistema.</Text></View></View></View>
  </Frame>;
}
