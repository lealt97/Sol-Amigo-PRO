import React from 'react';
import {
  BadgeDollarSign,
  BatteryCharging,
  Bolt,
  Check,
  ClipboardCheck,
  FileCheck2,
  Hammer,
  House,
  PackageCheck,
  PanelTop,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import type { ProposalPageKey } from '../../../lib/pdf/proposalPageRegistry';

interface ProposalPreviewPageProps {
  pageKey: ProposalPageKey;
  pageNumber: number;
  theme: PdfDocumentTheme;
}

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const consumption = [890, 840, 875, 920, 960, 1010, 1040, 990, 940, 900, 870, 910];
const generation = [880, 830, 870, 900, 885, 820, 850, 930, 990, 1010, 980, 920];

function PreviewPageFrame({
  theme,
  pageNumber,
  eyebrow,
  title,
  children,
}: {
  theme: PdfDocumentTheme;
  pageNumber: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full overflow-hidden bg-white px-[6.8%] pb-[5.5%] pt-[6.2%] text-slate-800">
      <div
        className="absolute left-0 top-0 h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent})` }}
      />
      <div className="mb-[4.5%] flex items-start justify-between gap-6">
        <div>
          <div
            className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em]"
            style={{ color: theme.secondary }}
          >
            {eyebrow}
          </div>
          <h2 className="max-w-[540px] text-[28px] font-black leading-[1.08]" style={{ color: theme.text }}>
            {title}
          </h2>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
          style={{ backgroundColor: theme.primarySoft, color: theme.primary }}
        >
          {String(pageNumber).padStart(2, '0')}
        </div>
      </div>
      <div className="h-[82%]">{children}</div>
      <div className="absolute bottom-[2.4%] left-[6.8%] right-[6.8%] flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
        <span>Proposta fotovoltaica • Cliente Exemplo</span>
        <span>Sol Amigo PRO</span>
      </div>
    </div>
  );
}

function MetricCard({
  theme,
  icon,
  value,
  label,
  accent = 'primary',
}: {
  theme: PdfDocumentTheme;
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: 'primary' | 'secondary' | 'accent';
}) {
  const color = theme[accent];
  const soft = theme[`${accent}Soft` as 'primarySoft' | 'secondarySoft' | 'accentSoft'];

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: soft }}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80" style={{ color }}>
        {icon}
      </div>
      <div className="text-[21px] font-black leading-none" style={{ color: theme.text }}>
        {value}
      </div>
      <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.muted }}>
        {label}
      </div>
    </div>
  );
}

function ConsultingIllustration({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <svg viewBox="0 0 420 220" className="h-full w-full" role="img" aria-label="Consultor apresentando uma solução solar ao cliente">
      <rect x="0" y="0" width="420" height="220" rx="28" fill={theme.surface} />
      <circle cx="105" cy="68" r="31" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" />
      <path d="M78 65c5-26 48-36 58-4-13-5-20-13-27-25-4 14-14 24-31 29Z" fill={theme.neutralSoft} stroke={theme.text} strokeWidth="4" strokeLinejoin="round" />
      <path d="M91 71c5 6 12 6 17 0" fill="none" stroke={theme.text} strokeWidth="3" strokeLinecap="round" />
      <path d="M62 187c2-54 18-79 44-79 28 0 47 29 49 79" fill={theme.secondarySoft} stroke={theme.text} strokeWidth="4" strokeLinejoin="round" />
      <path d="M104 111v77" stroke={theme.text} strokeWidth="4" />
      <path d="M105 112l-16 21 16 13 17-13-17-21Z" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
      <path d="M69 134l-35-20M145 137l50-27" stroke={theme.text} strokeWidth="5" strokeLinecap="round" />
      <path d="M30 102l17 7-10 17" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="318" cy="69" r="31" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" />
      <path d="M291 59c12-25 46-25 57 3-8-4-15-7-24-7-13 0-24 4-33 12Z" fill={theme.primarySoft} stroke={theme.text} strokeWidth="4" strokeLinejoin="round" />
      <path d="M305 72c5 5 12 5 17 0" fill="none" stroke={theme.text} strokeWidth="3" strokeLinecap="round" />
      <path d="M268 187c2-52 18-79 49-79 32 0 49 27 51 79" fill={theme.primary} stroke={theme.text} strokeWidth="4" strokeLinejoin="round" />
      <path d="M317 111v76" stroke={theme.text} strokeWidth="4" />
      <path d="M316 113l-15 20 15 13 16-13-16-20Z" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
      <path d="M287 127c-18 8-25 23-27 43M350 128c17 7 25 21 29 38" fill="none" stroke={theme.text} strokeWidth="5" strokeLinecap="round" />
      <path d="M188 66h66v48h-66z" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" rx="8" />
      <path d="M199 101l12-14 11 8 19-24" fill="none" stroke={theme.primary} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="242" cy="71" r="7" fill={theme.accent} />
      <path d="M194 47l-9-10M219 40V25M245 47l10-10" stroke={theme.secondary} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function SolarHouseIllustration({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <svg viewBox="0 0 420 255" className="h-full w-full" role="img" aria-label="Casa com sistema fotovoltaico">
      <rect width="420" height="255" rx="28" fill={theme.surface} />
      <circle cx="337" cy="56" r="28" fill={theme.accent} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const radians = (angle * Math.PI) / 180;
        const x1 = 337 + Math.cos(radians) * 40;
        const y1 = 56 + Math.sin(radians) * 40;
        const x2 = 337 + Math.cos(radians) * 52;
        const y2 = 56 + Math.sin(radians) * 52;
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.secondary} strokeWidth="4" strokeLinecap="round" />;
      })}
      <path d="M54 139 204 53l151 86v84H54Z" fill="#FFFFFF" stroke={theme.text} strokeWidth="5" strokeLinejoin="round" />
      <path d="M77 130 204 57l126 73" fill="none" stroke={theme.primary} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(113 83) skewX(-25)">
        <rect width="82" height="50" rx="4" fill={theme.primary} stroke={theme.text} strokeWidth="4" />
        <path d="M27 0v50M55 0v50M0 25h82" stroke={theme.primarySoft} strokeWidth="2" />
      </g>
      <g transform="translate(211 83) skewX(-25)">
        <rect width="82" height="50" rx="4" fill={theme.secondary} stroke={theme.text} strokeWidth="4" />
        <path d="M27 0v50M55 0v50M0 25h82" stroke={theme.secondarySoft} strokeWidth="2" />
      </g>
      <rect x="86" y="163" width="65" height="60" rx="5" fill={theme.primarySoft} stroke={theme.text} strokeWidth="4" />
      <path d="M118 163v60M86 193h65" stroke={theme.text} strokeWidth="3" />
      <rect x="248" y="153" width="56" height="70" rx="5" fill={theme.secondarySoft} stroke={theme.text} strokeWidth="4" />
      <circle cx="293" cy="190" r="4" fill={theme.accent} />
      <path d="M357 159c21 12 27 25 22 39-7 19-33 25-55 8" fill="none" stroke={theme.secondary} strokeWidth="5" strokeLinecap="round" />
      <path d="m323 205 11-1-4-10" fill="none" stroke={theme.secondary} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GrowthIllustration({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <svg viewBox="0 0 420 220" className="h-full w-full" role="img" aria-label="Crescimento da economia com energia solar">
      <rect width="420" height="220" rx="28" fill={theme.surface} />
      <path d="M54 174h318" stroke={theme.border} strokeWidth="3" />
      <rect x="81" y="133" width="42" height="41" rx="7" fill={theme.primarySoft} stroke={theme.primary} strokeWidth="4" />
      <rect x="151" y="105" width="42" height="69" rx="7" fill={theme.secondarySoft} stroke={theme.secondary} strokeWidth="4" />
      <rect x="221" y="75" width="42" height="99" rx="7" fill={theme.accentSoft} stroke={theme.accent} strokeWidth="4" />
      <rect x="291" y="43" width="42" height="131" rx="7" fill={theme.primary} stroke={theme.text} strokeWidth="4" />
      <path d="M79 126c67-4 121-25 176-69 31-25 62-28 88-28" fill="none" stroke={theme.text} strokeWidth="5" strokeLinecap="round" />
      <path d="m334 20 15 9-12 12" fill="none" stroke={theme.text} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="75" cy="68" r="30" fill="#FFFFFF" stroke={theme.text} strokeWidth="4" />
      <path d="M58 61c12-15 29-14 38 2-8-3-14-3-21-1-6 1-11 5-17 10Z" fill={theme.neutralSoft} stroke={theme.text} strokeWidth="4" />
      <path d="M62 78c7 6 15 6 22 0" fill="none" stroke={theme.text} strokeWidth="3" strokeLinecap="round" />
      <path d="M41 165c1-42 13-66 35-66 23 0 36 24 38 66" fill={theme.secondarySoft} stroke={theme.text} strokeWidth="4" />
      <path d="M77 102v62" stroke={theme.text} strokeWidth="4" />
      <circle cx="369" cy="58" r="24" fill={theme.accent} stroke={theme.text} strokeWidth="4" />
      <path d="M369 45v27M359 53h14c7 0 7 10 0 10h-9c-7 0-7 10 0 10h15" fill="none" stroke={theme.onAccent} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SummaryPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Uma decisão inteligente" title="Sua energia pode trabalhar a favor do seu patrimônio">
      <div className="grid h-full grid-cols-[1.04fr_.96fr] gap-5">
        <div className="flex flex-col justify-between">
          <p className="max-w-[330px] text-[12px] font-medium leading-relaxed" style={{ color: theme.muted }}>
            Dimensionamos uma solução para reduzir a energia comprada da distribuidora, proteger o seu orçamento contra reajustes e gerar economia por muitos anos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard theme={theme} icon={<Sun className="h-5 w-5" />} value="12,50 kWp" label="Potência instalada" />
            <MetricCard theme={theme} icon={<Zap className="h-5 w-5" />} value="1.490 kWh" label="Geração média/mês" accent="secondary" />
            <MetricCard theme={theme} icon={<TrendingUp className="h-5 w-5" />} value="4 anos e 8 meses" label="Retorno estimado" accent="accent" />
            <MetricCard theme={theme} icon={<BadgeDollarSign className="h-5 w-5" />} value="R$ 318 mil" label="Economia em 25 anos" />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="h-[57%]"><ConsultingIllustration theme={theme} /></div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em]"><Sparkles className="h-4 w-4" /> Resultado esperado</div>
            <p className="text-[12px] font-semibold leading-relaxed">Uma solução equilibrada entre geração, segurança técnica e retorno financeiro.</p>
          </div>
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function ConsumptionPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const maxValue = Math.max(...consumption, ...generation);
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Diagnóstico energético" title="Consumo atendido com menos dependência da rede">
      <div className="flex h-full flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard theme={theme} icon={<Bolt className="h-5 w-5" />} value="920 kWh" label="Consumo médio" />
          <MetricCard theme={theme} icon={<Sun className="h-5 w-5" />} value="1.490 kWh" label="Geração estimada" accent="secondary" />
          <MetricCard theme={theme} icon={<House className="h-5 w-5" />} value="Até 95%" label="Compensação projetada" accent="accent" />
        </div>
        <div className="flex-1 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-black" style={{ color: theme.text }}>Consumo x geração solar</div>
              <div className="mt-1 text-[9px]" style={{ color: theme.muted }}>Estimativa mensal em kWh</div>
            </div>
            <div className="flex gap-4 text-[8px] font-bold uppercase tracking-wider" style={{ color: theme.muted }}>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.primary }} /> Consumo</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.accent }} /> Geração</span>
            </div>
          </div>
          <div className="flex h-[210px] items-end gap-2 border-b border-l px-2" style={{ borderColor: theme.border }}>
            {months.map((month, index) => (
              <div key={month} className="flex h-full flex-1 flex-col justify-end">
                <div className="flex h-[178px] items-end justify-center gap-[2px]">
                  <div className="w-[42%] rounded-t-sm" style={{ height: `${(consumption[index] / maxValue) * 100}%`, backgroundColor: theme.primary }} />
                  <div className="w-[42%] rounded-t-sm" style={{ height: `${(generation[index] / maxValue) * 100}%`, backgroundColor: theme.accent }} />
                </div>
                <div className="pt-2 text-center text-[7px] font-bold" style={{ color: theme.muted }}>{month}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border-l-4 p-4 text-[11px] font-semibold leading-relaxed" style={{ borderLeftColor: theme.secondary, backgroundColor: theme.secondarySoft, color: theme.text }}>
          O consumo do imóvel continua sendo atendido. A diferença é que grande parte da energia passa a ser produzida no próprio local.
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function TechnicalPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const specs = [
    ['15', 'Módulos fotovoltaicos'],
    ['540 Wp', 'Potência por módulo'],
    ['8 kW', 'Inversor dimensionado'],
    ['11.760 kWh', 'Geração anual'],
  ];
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Engenharia e desempenho" title="Um sistema dimensionado para o perfil do seu imóvel">
      <div className="grid h-full grid-cols-[1.05fr_.95fr] gap-5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {specs.map(([value, label], index) => (
              <div key={label} className="rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: index % 2 ? theme.secondarySoft : theme.primarySoft }}>
                <div className="text-[20px] font-black" style={{ color: theme.text }}>{value}</div>
                <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.muted }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: theme.neutralSoft }}>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: theme.text }}>O que foi considerado</div>
            <div className="grid grid-cols-2 gap-3 text-[9px] font-semibold" style={{ color: theme.muted }}>
              {['Irradiação local', 'Perdas técnicas', 'Orientação do telhado', 'Histórico de consumo'].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5" style={{ color: theme.secondary }} />{item}</span>)}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="h-[66%]"><SolarHouseIllustration theme={theme} /></div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]"><ShieldCheck className="h-4 w-4" /> Projeto seguro</div>
            <p className="text-[10px] font-semibold leading-relaxed">O posicionamento definitivo será validado na vistoria e no projeto executivo.</p>
          </div>
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function KitPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const rows = [
    ['Módulos fotovoltaicos', 'SolarMax 540 Wp', '15 un.', '12/25 anos'],
    ['Inversor', 'PowerGrid 8 kW', '1 un.', '10 anos'],
    ['Estrutura de fixação', 'Telhado cerâmico', '1 cj.', 'Fabricante'],
    ['Proteções CA e CC', 'String box e DPS', '1 cj.', 'Fabricante'],
    ['Monitoramento', 'Aplicativo e portal', '1 un.', 'Incluído'],
    ['Cabeamento solar', 'Cabos e conectores', '1 cj.', 'Fabricante'],
  ];
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Equipamentos incluídos" title="Tecnologia selecionada para desempenho e durabilidade">
      <div className="flex h-full flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard theme={theme} icon={<PanelTop className="h-5 w-5" />} value="15 módulos" label="Arranjo fotovoltaico" />
          <MetricCard theme={theme} icon={<BatteryCharging className="h-5 w-5" />} value="8 kW" label="Potência do inversor" accent="secondary" />
          <MetricCard theme={theme} icon={<PackageCheck className="h-5 w-5" />} value="Kit completo" label="Instalação incluída" accent="accent" />
        </div>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: theme.border }}>
          <div className="grid grid-cols-[1.45fr_1.35fr_.55fr_.75fr] px-4 py-3 text-[8px] font-black uppercase tracking-[0.12em]" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
            <span>Item</span><span>Modelo / especificação</span><span>Qtd.</span><span>Garantia</span>
          </div>
          {rows.map((row, index) => (
            <div key={row[0]} className="grid grid-cols-[1.45fr_1.35fr_.55fr_.75fr] px-4 py-3 text-[9px] font-semibold" style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : theme.primarySoft, color: theme.text }}>
              {row.map((cell) => <span key={cell}>{cell}</span>)}
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4 text-[10px] font-semibold leading-relaxed" style={{ backgroundColor: theme.accentSoft, color: theme.text }}>
          A relação final poderá receber ajustes equivalentes de marca ou modelo mediante disponibilidade, sem redução das especificações contratadas.
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function RoofPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Estudo visual" title="Uma prévia de como o sistema poderá ocupar o seu telhado">
      <div className="flex h-full flex-col gap-4">
        <div className="relative flex-1 overflow-hidden rounded-3xl border" style={{ borderColor: theme.border, background: `linear-gradient(145deg, ${theme.primarySoft}, ${theme.secondarySoft})` }}>
          <svg viewBox="0 0 700 430" className="absolute inset-0 h-full w-full">
            <rect width="700" height="430" fill={theme.surface} />
            <path d="M70 292 348 92l284 200v92H70Z" fill="#FFFFFF" stroke={theme.text} strokeWidth="8" strokeLinejoin="round" />
            <path d="M93 279 348 96l260 183" fill="none" stroke={theme.secondary} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            {[0, 1, 2, 3, 4].map((column) => [0, 1, 2].map((row) => (
              <g key={`${column}-${row}`} transform={`translate(${186 + column * 65} ${165 + row * 58}) skewX(-28)`}>
                <rect width="54" height="42" rx="3" fill={column % 2 ? theme.secondary : theme.primary} stroke={theme.text} strokeWidth="4" />
                <path d="M18 0v42M36 0v42M0 21h54" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.5" />
              </g>
            )))}
            <circle cx="603" cy="73" r="32" fill={theme.accent} />
          </svg>
          <div className="absolute bottom-4 left-4 rounded-xl bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-[10px] font-black" style={{ color: theme.text }}>15 módulos representados</div>
            <div className="mt-1 text-[8px]" style={{ color: theme.muted }}>Distribuição ilustrativa para apresentação comercial</div>
          </div>
        </div>
        <div className="rounded-2xl border-l-4 p-4 text-[10px] font-semibold leading-relaxed" style={{ borderLeftColor: theme.accent, backgroundColor: theme.accentSoft, color: theme.text }}>
          O posicionamento final poderá ser ajustado após vistoria técnica, análise estrutural e elaboração do projeto executivo.
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function TimelinePage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const steps = [
    [FileCheck2, 'Aprovação', 'Formalização e documentos'],
    [ClipboardCheck, 'Vistoria', 'Validação técnica do imóvel'],
    [PanelTop, 'Projeto', 'Dimensionamento executivo'],
    [ShieldCheck, 'Homologação', 'Envio para a distribuidora'],
    [PackageCheck, 'Entrega', 'Logística dos equipamentos'],
    [Hammer, 'Instalação', 'Montagem e ativação'],
  ] as const;
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Do aceite à geração" title="Um processo organizado, transparente e acompanhado">
      <div className="grid h-full grid-cols-[.92fr_1.08fr] gap-5">
        <div className="h-full"><ConsultingIllustration theme={theme} /></div>
        <div className="relative flex flex-col justify-between py-2">
          <div className="absolute bottom-6 left-[19px] top-6 w-[3px] rounded-full" style={{ backgroundColor: theme.primarySoft }} />
          {steps.map(([Icon, title, description], index) => (
            <div key={title} className="relative flex items-center gap-4">
              <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white" style={{ backgroundColor: index % 3 === 0 ? theme.primary : index % 3 === 1 ? theme.secondary : theme.accent, color: index % 3 === 2 ? theme.onAccent : '#FFFFFF' }}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 rounded-2xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: index % 2 ? theme.surface : '#FFFFFF' }}>
                <div className="text-[11px] font-black" style={{ color: theme.text }}>{index + 1}. {title}</div>
                <div className="mt-1 text-[9px] font-medium" style={{ color: theme.muted }}>{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function FinancialPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Condição comercial" title="Um investimento que substitui uma despesa recorrente">
      <div className="grid h-full grid-cols-[1fr_.95fr] gap-5">
        <div className="flex flex-col justify-between gap-4">
          <div className="rounded-3xl p-6" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">Investimento total</div>
            <div className="mt-4 text-[38px] font-black leading-none">R$ 42.000</div>
            <div className="mt-4 text-[10px] font-semibold opacity-80">Equipamentos, projeto, homologação e instalação incluídos.</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard theme={theme} icon={<BadgeDollarSign className="h-5 w-5" />} value="R$ 930/mês" label="Economia inicial" accent="secondary" />
            <MetricCard theme={theme} icon={<TrendingUp className="h-5 w-5" />} value="R$ 318 mil" label="Economia em 25 anos" accent="accent" />
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: theme.border }}>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: theme.text }}>Condição sugerida</div>
            <div className="flex items-end justify-between">
              <div><div className="text-[8px] font-bold uppercase" style={{ color: theme.muted }}>Entrada</div><div className="mt-1 text-[17px] font-black" style={{ color: theme.text }}>R$ 8.400</div></div>
              <div className="text-right"><div className="text-[8px] font-bold uppercase" style={{ color: theme.muted }}>Saldo</div><div className="mt-1 text-[17px] font-black" style={{ color: theme.text }}>Até 60 parcelas</div></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="h-[62%]"><GrowthIllustration theme={theme} /></div>
          <div className="rounded-2xl p-5" style={{ backgroundColor: theme.secondarySoft }}>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: theme.text }}><Bolt className="h-4 w-4" style={{ color: theme.secondary }} /> Comparação prática</div>
            <p className="text-[11px] font-semibold leading-relaxed" style={{ color: theme.text }}>Sem o sistema, a conta continua sendo paga indefinidamente. Com o sistema, parte desse gasto se transforma em um ativo instalado no imóvel.</p>
          </div>
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function PaybackPage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const points = '30,205 102,188 174,164 246,132 318,93 390,51 470,28';
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Retorno do investimento" title="A economia acumulada supera o investimento e continua crescendo">
      <div className="grid h-full grid-cols-[1.08fr_.92fr] gap-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <div className="mb-4 flex items-center justify-between"><div><div className="text-[12px] font-black" style={{ color: theme.text }}>Fluxo de caixa acumulado</div><div className="mt-1 text-[9px]" style={{ color: theme.muted }}>Projeção de 25 anos</div></div><div className="rounded-xl px-3 py-2 text-[9px] font-black" style={{ backgroundColor: theme.accentSoft, color: theme.onAccent }}>Payback: 4a 8m</div></div>
            <svg viewBox="0 0 500 240" className="w-full">
              {[45, 85, 125, 165, 205].map((y) => <line key={y} x1="30" y1={y} x2="470" y2={y} stroke={theme.border} strokeWidth="2" />)}
              <line x1="30" y1="165" x2="470" y2="165" stroke={theme.secondary} strokeWidth="3" strokeDasharray="7 7" />
              <polyline points={points} fill="none" stroke={theme.primary} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="174" cy="164" r="9" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
              <text x="174" y="148" textAnchor="middle" fontSize="13" fontWeight="800" fill={theme.text}>Ponto de retorno</text>
              {['0', '5', '10', '15', '20', '25'].map((year, index) => <text key={year} x={30 + index * 88} y="232" textAnchor="middle" fontSize="11" fontWeight="700" fill={theme.muted}>{year} anos</text>)}
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard theme={theme} icon={<TrendingUp className="h-5 w-5" />} value="R$ 64 mil" label="10 anos" />
            <MetricCard theme={theme} icon={<BadgeDollarSign className="h-5 w-5" />} value="R$ 148 mil" label="15 anos" accent="secondary" />
            <MetricCard theme={theme} icon={<Sparkles className="h-5 w-5" />} value="R$ 318 mil" label="25 anos" accent="accent" />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="h-[58%]"><GrowthIllustration theme={theme} /></div>
          <div className="rounded-2xl p-5" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em]">Premissas transparentes</div>
            <p className="text-[10px] font-semibold leading-relaxed opacity-90">Tarifa atual, reajustes projetados, degradação dos módulos, conta residual e manutenção prevista.</p>
          </div>
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function AcceptancePage({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame theme={theme} pageNumber={pageNumber} eyebrow="Próximo passo" title="Pronto para transformar sua conta de energia em economia?">
      <div className="grid h-full grid-cols-[1.02fr_.98fr] gap-5">
        <div className="flex flex-col justify-between gap-4">
          <div className="rounded-3xl p-6" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent, color: theme.onAccent }}><Zap className="h-6 w-6" /></div>
            <div className="text-[22px] font-black leading-tight">Aprove esta proposta para iniciarmos a vistoria técnica e o seu projeto.</div>
            <div className="mt-5 text-[10px] font-semibold opacity-80">Validade da condição comercial: 10 dias.</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Vistoria técnica', 'Projeto executivo', 'Homologação', 'Instalação completa'].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border px-3 py-3 text-[9px] font-bold" style={{ borderColor: theme.border, color: theme.text }}><Check className="h-4 w-4" style={{ color: theme.secondary }} />{item}</div>)}
          </div>
          <div className="rounded-2xl p-4 text-[10px] font-semibold" style={{ backgroundColor: theme.accentSoft, color: theme.text }}>Fale com seu consultor: (11) 99999-9999 • comercial@empresa.com.br</div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="h-[55%]"><ConsultingIllustration theme={theme} /></div>
          <div className="space-y-5 rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <div><div className="h-px w-full" style={{ backgroundColor: theme.border }} /><div className="mt-2 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.muted }}>Assinatura do cliente</div></div>
            <div className="grid grid-cols-2 gap-4"><div><div className="h-px w-full" style={{ backgroundColor: theme.border }} /><div className="mt-2 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.muted }}>Data</div></div><div><div className="h-px w-full" style={{ backgroundColor: theme.border }} /><div className="mt-2 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.muted }}>Código da proposta</div></div></div>
          </div>
        </div>
      </div>
    </PreviewPageFrame>
  );
}

export function ProposalPreviewPage({ pageKey, pageNumber, theme }: ProposalPreviewPageProps) {
  switch (pageKey) {
    case 'intro':
      return <SummaryPage theme={theme} pageNumber={pageNumber} />;
    case 'consumption':
      return <ConsumptionPage theme={theme} pageNumber={pageNumber} />;
    case 'technical':
      return <TechnicalPage theme={theme} pageNumber={pageNumber} />;
    case 'kit':
      return <KitPage theme={theme} pageNumber={pageNumber} />;
    case 'roof':
      return <RoofPage theme={theme} pageNumber={pageNumber} />;
    case 'timeline':
      return <TimelinePage theme={theme} pageNumber={pageNumber} />;
    case 'financial':
      return <FinancialPage theme={theme} pageNumber={pageNumber} />;
    case 'payback':
      return <PaybackPage theme={theme} pageNumber={pageNumber} />;
    case 'acceptance':
      return <AcceptancePage theme={theme} pageNumber={pageNumber} />;
    case 'cover':
    default:
      return null;
  }
}
