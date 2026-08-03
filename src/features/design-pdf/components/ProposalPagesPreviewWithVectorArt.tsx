import type { ReactNode } from 'react';
import type { PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import type { ProposalPageKey } from '../../../lib/pdf/proposalPageRegistry';
import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';
import kitEquipmentImage from '../../../assets/pdf-art/kitEquipmentImage';
import implementationTimelineImage from '../../../assets/pdf-art/implementationTimelineImage';
import { ProposalPreviewPage as LegacyProposalPreviewPage } from './ProposalPagesPreview';

interface ProposalPreviewPageProps {
  pageKey: ProposalPageKey;
  pageNumber: number;
  theme: PdfDocumentTheme;
}

function PreviewPageFrame({ theme, pageNumber, eyebrow, title, children }: { theme: PdfDocumentTheme; pageNumber: number; eyebrow: string; title: string; children: ReactNode }) {
  return <div className="relative h-full overflow-hidden bg-white px-[6.8%] pb-[5.5%] pt-[6.2%] text-slate-800">
    <div className="absolute left-0 top-0 h-2 w-full" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent})` }} />
    <div className="mb-[4%] flex items-start justify-between gap-6"><div><div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em]" style={{ color: theme.secondary }}>{eyebrow}</div><h2 className="max-w-[560px] text-[28px] font-black leading-[1.08]" style={{ color: theme.text }}>{title}</h2></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black" style={{ backgroundColor: theme.primarySoft, color: theme.primary }}>{String(pageNumber).padStart(2, '0')}</div></div>
    <div className="h-[82%]">{children}</div>
    <div className="absolute bottom-[2.4%] left-[6.8%] right-[6.8%] flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.muted }}><span>Proposta fotovoltaica • Cliente Exemplo</span><span>Sol Amigo PRO</span></div>
  </div>;
}

function Metric({ theme, value, label, accent = 'primary' }: { theme: PdfDocumentTheme; value: string; label: string; accent?: 'primary' | 'secondary' | 'accent' }) {
  const color = theme[accent]; const soft = theme[`${accent}Soft` as 'primarySoft' | 'secondarySoft' | 'accentSoft'];
  return <div className="rounded-2xl border p-3.5" style={{ borderColor: theme.border, backgroundColor: soft }}><div className="mb-2 h-1.5 w-7 rounded-full" style={{ backgroundColor: color }} /><div className="text-[19px] font-black leading-none" style={{ color: theme.text }}>{value}</div><div className="mt-2 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: theme.muted }}>{label}</div></div>;
}

function ArtCard({ source, theme, label, className = '' }: { source: string; theme: PdfDocumentTheme; label: string; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl border bg-white p-3 ${className}`} style={{ borderColor: theme.border }}><img src={source} alt={label} className="h-full w-full object-contain" /></div>;
}

function KitPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const rows = [['Módulos fotovoltaicos','Marca e modelo selecionados','24 un.','550 Wp'],['Inversor','Modelo compatível com o arranjo','1 un.','10 kW'],['Estrutura de fixação','Conforme o tipo de telhado','1 cj.','Completa'],['Proteções CA e CC','DPS, disjuntores e seccionamento','1 cj.','Incluído'],['Monitoramento','Aplicativo e portal web','1 un.','Incluído']];
  return <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Equipamentos incluídos" title="Tecnologia selecionada para desempenho e durabilidade"><div className="flex h-full flex-col gap-3.5"><div className="grid h-[38%] grid-cols-[.82fr_1.18fr] gap-4"><div className="grid grid-cols-2 gap-3"><Metric theme={theme} value="24" label="Módulos" /><Metric theme={theme} value="10 kW" label="Inversor" accent="secondary" /><div className="col-span-2 rounded-2xl p-4 text-[11px] font-semibold leading-relaxed" style={{ backgroundColor: theme.accentSoft, color: theme.text }}>Kit completo com módulos, inversor, estrutura, proteções, cabeamento e monitoramento.</div></div><ArtCard source={kitEquipmentImage} theme={theme} label="Kit fotovoltaico com módulos, inversor, estrutura e técnicos" /></div><div className="overflow-hidden rounded-2xl border" style={{ borderColor: theme.border }}><div className="grid grid-cols-[1.1fr_1.5fr_.55fr_.7fr] px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.12em]" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}><span>Item</span><span>Modelo / especificação</span><span>Qtd.</span><span>Detalhe</span></div>{rows.map((row, index) => <div key={row[0]} className="grid grid-cols-[1.1fr_1.5fr_.55fr_.7fr] items-center px-4 py-2.5 text-[9px]" style={{ backgroundColor: index % 2 ? theme.primarySoft : '#FFFFFF', color: theme.text }}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span></div>)}</div></div></PreviewPageFrame>;
}

function TimelinePreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const steps = [['01','Aprovação'],['02','Homologação'],['03','Entrega'],['04','Instalação'],['05','Ativação']];
  return <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Do aceite à geração" title="Um processo organizado, transparente e acompanhado"><div className="flex h-full flex-col gap-4"><ArtCard source={implementationTimelineImage} theme={theme} label="Etapas do projeto fotovoltaico" className="h-[57%]" /><div className="grid flex-1 grid-cols-5 gap-2.5">{steps.map(([number, title], index) => { const color = index % 3 === 0 ? theme.primary : index % 3 === 1 ? theme.secondary : theme.accent; const soft = index % 3 === 0 ? theme.primarySoft : index % 3 === 1 ? theme.secondarySoft : theme.accentSoft; return <div key={title} className="rounded-2xl border p-3" style={{ borderColor: theme.border, backgroundColor: soft }}><div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ backgroundColor: color }}>{number}</div><div className="text-[10px] font-black" style={{ color: theme.text }}>{title}</div></div>; })}</div></div></PreviewPageFrame>;
}

function FinancialPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Condição comercial" title="Um investimento que substitui uma despesa recorrente"><div className="grid h-full grid-cols-[.88fr_1.12fr] gap-5"><div className="flex flex-col gap-3.5"><div className="rounded-2xl p-5" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}><div className="text-[9px] font-black uppercase tracking-[0.16em]">Investimento total</div><div className="my-3 text-[31px] font-black">R$ 42.900</div><p className="text-[10px] font-semibold leading-relaxed">Equipamentos, projeto, homologação e instalação incluídos.</p></div><div className="grid grid-cols-2 gap-3"><Metric theme={theme} value="R$ 820/mês" label="Economia inicial" accent="secondary" /><Metric theme={theme} value="R$ 318 mil" label="Economia em 25 anos" accent="accent" /></div><div className="rounded-2xl border p-4 text-[11px] font-semibold leading-relaxed" style={{ borderColor: theme.border, color: theme.muted }}>Parte de uma despesa recorrente passa a se transformar em patrimônio e economia acumulada.</div></div><div className="flex flex-col gap-3.5"><ArtCard source={financialReturnImage} theme={theme} label="Retorno financeiro do sistema solar" className="h-[66%]" /><div className="rounded-2xl p-4 text-[11px] font-semibold leading-relaxed" style={{ backgroundColor: theme.accentSoft, color: theme.text }}>O sistema reduz a energia comprada da rede e gera economia por muitos anos.</div></div></div></PreviewPageFrame>;
}

function PaybackPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Retorno do investimento" title="A economia acumulada supera o investimento e continua crescendo"><div className="grid h-full grid-cols-[1.15fr_.85fr] gap-5"><div className="flex flex-col gap-3.5"><div className="rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}><div className="mb-3 flex items-start justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.text }}>Fluxo de caixa acumulado</div><div className="mt-1 text-[9px]" style={{ color: theme.muted }}>Projeção de 25 anos</div></div><div className="rounded-xl px-3 py-2 text-[9px] font-black" style={{ backgroundColor: theme.accentSoft, color: theme.text }}>Payback: 4a 8m</div></div><svg viewBox="0 0 480 210" className="h-[220px] w-full">{[35,75,115,155,195].map((y) => <line key={y} x1="0" y1={y} x2="480" y2={y} stroke={theme.border} />)}<line x1="0" y1="132" x2="480" y2="132" stroke={theme.secondary} strokeWidth="2" strokeDasharray="6 6" /><polyline points="0,190 96,126 192,92 288,64 384,37 480,18" fill="none" stroke={theme.primary} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="90" cy="132" r="9" fill={theme.accent} stroke={theme.text} strokeWidth="3" /></svg><div className="flex justify-between text-[8px]" style={{ color: theme.muted }}><span>0 anos</span><span>5 anos</span><span>10 anos</span><span>15 anos</span><span>20 anos</span><span>25 anos</span></div></div><div className="grid grid-cols-3 gap-3"><Metric theme={theme} value="R$ 55 mil" label="10 anos" /><Metric theme={theme} value="R$ 114 mil" label="15 anos" accent="secondary" /><Metric theme={theme} value="R$ 232 mil" label="25 anos" accent="accent" /></div></div><div className="flex flex-col gap-3.5"><ArtCard source={financialReturnImage} theme={theme} label="Economia e retorno do investimento solar" className="h-[63%]" /><div className="rounded-2xl p-4 text-[10px] font-semibold leading-relaxed" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>Premissas transparentes: tarifa, reajustes, degradação, conta residual e manutenção prevista.</div></div></div></PreviewPageFrame>;
}

export function ProposalPreviewPage(props: ProposalPreviewPageProps) {
  switch (props.pageKey) {
    case 'kit': return <KitPreview theme={props.theme} pageNumber={props.pageNumber} />;
    case 'timeline': return <TimelinePreview theme={props.theme} pageNumber={props.pageNumber} />;
    case 'financial': return <FinancialPreview theme={props.theme} pageNumber={props.pageNumber} />;
    case 'payback': return <PaybackPreview theme={props.theme} pageNumber={props.pageNumber} />;
    default: return <LegacyProposalPreviewPage {...props} />;
  }
}
