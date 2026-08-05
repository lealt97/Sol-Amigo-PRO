import { useEffect, useState, type ReactNode } from 'react';
import type { PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import type { ProposalPageKey } from '../../../lib/pdf/proposalPageRegistry';
import { applyPdfThemeToIllustration } from '../../../lib/pdf/utils/illustrationColorEngine';
import accumulatedSavingsImage from '../../../assets/pdf-art/accumulatedSavingsImage';
import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';
import kitEquipmentImage from '../../../assets/pdf-art/kitEquipmentImage';
import implementationTimelineImage from '../../../assets/pdf-art/implementationTimelineImage';
import { ProposalPreviewPage as LegacyProposalPreviewPage } from './ProposalPagesPreview';

interface ProposalPreviewPageProps {
  pageKey: ProposalPageKey;
  pageNumber: number;
  theme: PdfDocumentTheme;
}

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
  children: ReactNode;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-white px-[6.8%] pb-[5.5%] pt-[6.2%] text-slate-800">
      <div
        className="absolute left-0 top-0 h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent})` }}
      />
      <div className="mb-[3.4%] flex items-start justify-between gap-6">
        <div>
          <div
            className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em]"
            style={{ color: theme.secondary }}
          >
            {eyebrow}
          </div>
          <h2 className="max-w-[560px] text-[28px] font-black leading-[1.08]" style={{ color: theme.text }}>
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
      <div className="h-[82.5%] min-h-0">{children}</div>
      <div
        className="absolute bottom-[2.4%] left-[6.8%] right-[6.8%] flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: theme.muted }}
      >
        <span>Proposta fotovoltaica • Cliente Exemplo</span>
        <span>Sol Amigo PRO</span>
      </div>
    </div>
  );
}

function Metric({
  theme,
  value,
  label,
  accent = 'primary',
  compact = false,
}: {
  theme: PdfDocumentTheme;
  value: string;
  label: string;
  accent?: 'primary' | 'secondary' | 'accent';
  compact?: boolean;
}) {
  const color = theme[accent];
  const soft = theme[`${accent}Soft` as 'primarySoft' | 'secondarySoft' | 'accentSoft'];
  return (
    <div
      className={`rounded-2xl border ${compact ? 'p-3' : 'p-3.5'}`}
      style={{ borderColor: theme.border, backgroundColor: soft }}
    >
      <div className="mb-2 h-1.5 w-7 rounded-full" style={{ backgroundColor: color }} />
      <div className={`${compact ? 'text-[16px]' : 'text-[19px]'} font-black leading-none`} style={{ color: theme.text }}>
        {value}
      </div>
      <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: theme.muted }}>
        {label}
      </div>
    </div>
  );
}

function useThemedIllustration(source: string, theme: PdfDocumentTheme, outputWidth = 1800) {
  const [themedSource, setThemedSource] = useState(source);

  useEffect(() => {
    let active = true;
    setThemedSource(source);

    void applyPdfThemeToIllustration(source, theme, { outputWidth }).then((result) => {
      if (active) setThemedSource(result);
    });

    return () => {
      active = false;
    };
  }, [source, outputWidth, theme.primary, theme.secondary, theme.accent, theme.neutral]);

  return themedSource;
}

function ArtStage({
  source,
  theme,
  label,
  className = '',
  outputWidth = 1800,
}: {
  source: string;
  theme: PdfDocumentTheme;
  label: string;
  className?: string;
  outputWidth?: number;
}) {
  const themedSource = useThemedIllustration(source, theme, outputWidth);
  return (
    <div
      className={`relative flex min-h-0 items-center justify-center overflow-hidden rounded-[22px] border px-3 py-2 ${className}`}
      style={{
        borderColor: theme.border,
        background: `linear-gradient(145deg, ${theme.surface}, #FFFFFF 68%)`,
      }}
    >
      <div
        className="absolute -right-[8%] -top-[18%] h-[58%] w-[42%] rounded-full opacity-60"
        style={{ backgroundColor: theme.primarySoft }}
      />
      <div
        className="absolute -bottom-[22%] -left-[6%] h-[46%] w-[40%] rounded-full opacity-70"
        style={{ backgroundColor: theme.accentSoft }}
      />
      <img
        src={themedSource}
        alt={label}
        className="relative z-10 h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

function KitPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const rows = [
    ['Módulos fotovoltaicos', 'Marca e modelo selecionados', '24 un.', '550 Wp'],
    ['Inversor', 'Modelo compatível com o arranjo', '1 un.', '10 kW'],
    ['Estrutura de fixação', 'Conforme o tipo de telhado', '1 cj.', 'Completa'],
    ['Proteções CA e CC', 'DPS, disjuntores e seccionamento', '1 cj.', 'Incluído'],
    ['Monitoramento', 'Aplicativo e portal web', '1 un.', 'Incluído'],
  ];

  return (
    <PreviewPageFrame
      theme={theme}
      pageNumber={pageNumber}
      eyebrow="Equipamentos incluídos"
      title="Tecnologia selecionada para desempenho e durabilidade"
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid h-[43%] min-h-0 grid-cols-[.72fr_1.28fr] gap-4">
          <div className="flex min-h-0 flex-col justify-center gap-3">
            <Metric theme={theme} value="24" label="Módulos" compact />
            <Metric theme={theme} value="10 kW" label="Potência do inversor" accent="secondary" compact />
            <div
              className="rounded-2xl p-3.5 text-[10px] font-semibold leading-relaxed"
              style={{ backgroundColor: theme.accentSoft, color: theme.text }}
            >
              Kit completo com módulos, inversor, estrutura, proteções, cabeamento e monitoramento.
            </div>
          </div>
          <ArtStage
            source={kitEquipmentImage}
            theme={theme}
            label="Kit fotovoltaico com módulos, inversor, estrutura e técnicos"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border" style={{ borderColor: theme.border }}>
          <div
            className="grid grid-cols-[1.1fr_1.5fr_.55fr_.7fr] px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em]"
            style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
          >
            <span>Item</span><span>Modelo / especificação</span><span>Qtd.</span><span>Detalhe</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row[0]}
              className="grid grid-cols-[1.1fr_1.5fr_.55fr_.7fr] items-center px-4 py-[7px] text-[8.5px]"
              style={{ backgroundColor: index % 2 ? theme.primarySoft : '#FFFFFF', color: theme.text }}
            >
              <strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span>
            </div>
          ))}
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function TimelinePreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  const steps = [['01', 'Planejamento'], ['02', 'Homologação'], ['03', 'Entrega'], ['04', 'Instalação'], ['05', 'Ativação']];
  return (
    <PreviewPageFrame
      theme={theme}
      pageNumber={pageNumber}
      eyebrow="Do aceite à geração"
      title="Um processo organizado, transparente e acompanhado"
    >
      <div className="flex h-full min-h-0 flex-col gap-3.5">
        <ArtStage
          source={implementationTimelineImage}
          theme={theme}
          label="Etapas do projeto fotovoltaico"
          className="h-[62%]"
          outputWidth={2100}
        />
        <div className="relative grid flex-1 grid-cols-5 gap-2.5 pt-2">
          <div
            className="absolute left-[8%] right-[8%] top-[25px] h-[2px]"
            style={{ backgroundColor: theme.border }}
          />
          {steps.map(([number, title], index) => {
            const color = index % 3 === 0 ? theme.primary : index % 3 === 1 ? theme.secondary : theme.accent;
            const soft = index % 3 === 0 ? theme.primarySoft : index % 3 === 1 ? theme.secondarySoft : theme.accentSoft;
            return (
              <div key={title} className="relative z-10 flex flex-col items-center text-center">
                <div
                  className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white text-[9px] font-black"
                  style={{ backgroundColor: color, color: index === 1 ? theme.text : '#FFFFFF' }}
                >
                  {number}
                </div>
                <div className="w-full rounded-xl px-1 py-2 text-[9px] font-black" style={{ backgroundColor: soft, color: theme.text }}>
                  {title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function FinancialPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame
      theme={theme}
      pageNumber={pageNumber}
      eyebrow="Condição comercial"
      title="Um investimento que substitui uma despesa recorrente"
    >
      <div className="flex h-full min-h-0 flex-col gap-3.5">
        <div className="grid h-[23%] shrink-0 grid-cols-[1.35fr_.78fr_.78fr] gap-3">
          <div
            className="flex min-h-0 flex-col justify-center rounded-2xl px-5 py-4"
            style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
          >
            <div className="text-[9px] font-black uppercase tracking-[0.16em]">Investimento total</div>
            <div className="my-2 text-[29px] font-black leading-none">R$ 42.900</div>
            <p className="text-[9px] font-semibold leading-relaxed">
              Equipamentos, projeto, homologação e instalação incluídos.
            </p>
          </div>
          <Metric theme={theme} value="R$ 820/mês" label="Economia inicial" accent="secondary" compact />
          <Metric theme={theme} value="R$ 318 mil" label="Economia em 25 anos" accent="accent" compact />
        </div>

        <ArtStage
          source={financialReturnImage}
          theme={theme}
          label="Retorno financeiro do sistema solar"
          className="min-h-0 flex-1"
          outputWidth={2400}
        />

        <div
          className="shrink-0 rounded-2xl border px-4 py-3 text-[10px] font-semibold leading-relaxed"
          style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
        >
          Parte do gasto recorrente com energia se transforma em um ativo instalado no imóvel e em economia acumulada.
        </div>
      </div>
    </PreviewPageFrame>
  );
}

function PaybackPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame
      theme={theme}
      pageNumber={pageNumber}
      eyebrow="Retorno do investimento"
      title="A economia acumulada supera o investimento e continua crescendo"
    >
      <div className="flex h-full min-h-0 flex-col gap-3.5">
        <div className="grid h-[57%] min-h-0 grid-cols-[1.12fr_.88fr] gap-4">
          <div className="rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.text }}>Fluxo de caixa acumulado</div>
                <div className="mt-1 text-[9px]" style={{ color: theme.muted }}>Projeção de 25 anos</div>
              </div>
              <div className="rounded-xl px-3 py-2 text-[9px] font-black" style={{ backgroundColor: theme.accentSoft, color: theme.text }}>Payback: 4a 8m</div>
            </div>
            <svg viewBox="0 0 480 210" className="h-[205px] w-full" aria-hidden="true">
              {[35, 75, 115, 155, 195].map((y) => <line key={y} x1="0" y1={y} x2="480" y2={y} stroke={theme.border} />)}
              <line x1="0" y1="132" x2="480" y2="132" stroke={theme.secondary} strokeWidth="2" strokeDasharray="6 6" />
              <polyline points="0,190 96,126 192,92 288,64 384,37 480,18" fill="none" stroke={theme.primary} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="90" cy="132" r="9" fill={theme.accent} stroke={theme.text} strokeWidth="3" />
            </svg>
            <div className="flex justify-between text-[8px]" style={{ color: theme.muted }}>
              <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25 anos</span>
            </div>
          </div>
          <ArtStage
            source={accumulatedSavingsImage}
            theme={theme}
            label="Economia e retorno do investimento solar"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric theme={theme} value="R$ 55 mil" label="10 anos" compact />
          <Metric theme={theme} value="R$ 114 mil" label="15 anos" accent="secondary" compact />
          <Metric theme={theme} value="R$ 232 mil" label="25 anos" accent="accent" compact />
        </div>
        <div
          className="rounded-2xl px-4 py-3 text-[10px] font-semibold leading-relaxed"
          style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
        >
          Premissas transparentes: tarifa, reajustes, degradação, conta residual e manutenção prevista.
        </div>
      </div>
    </PreviewPageFrame>
  );
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
