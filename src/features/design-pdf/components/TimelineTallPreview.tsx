import { useEffect, useState } from 'react';
import implementationTimelineImage from '../../../assets/pdf-art/implementationTimelineImage';
import type { PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import {
  applyPdfThemeToIllustration,
  TIMELINE_ILLUSTRATION_RENDER_OPTIONS,
} from '../../../lib/pdf/utils/illustrationColorEngine';

interface TimelineTallPreviewProps {
  theme: PdfDocumentTheme;
  pageNumber: number;
}

function useTimelineIllustration(theme: PdfDocumentTheme) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSource(null);

    void applyPdfThemeToIllustration(
      implementationTimelineImage,
      theme,
      TIMELINE_ILLUSTRATION_RENDER_OPTIONS,
    ).then((result) => {
      if (active) setSource(result);
    });

    return () => {
      active = false;
    };
  }, [theme.primary]);

  return source;
}

export function TimelineTallPreview({ theme, pageNumber }: TimelineTallPreviewProps) {
  const illustration = useTimelineIllustration(theme);
  const steps = [
    ['01', 'Planejamento'],
    ['02', 'Homologação'],
    ['03', 'Entrega'],
    ['04', 'Instalação'],
    ['05', 'Ativação'],
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-white px-[6.8%] pb-[5.5%] pt-[6.2%] text-slate-800">
      <div className="absolute left-0 top-0 flex h-2 w-full" aria-hidden="true">
        <div className="flex-1" style={{ backgroundColor: theme.primary }} />
        <div className="flex-1" style={{ backgroundColor: theme.secondary }} />
        <div className="flex-1" style={{ backgroundColor: theme.accent }} />
      </div>

      <div className="mb-[3.4%] flex items-start justify-between gap-6">
        <div>
          <div
            className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em]"
            style={{ color: theme.secondary }}
          >
            Do aceite à geração
          </div>
          <h2 className="max-w-[560px] text-[28px] font-black leading-[1.08]" style={{ color: theme.text }}>
            Um processo organizado, transparente e acompanhado
          </h2>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
          style={{ backgroundColor: theme.primarySoft, color: theme.primary }}
        >
          {String(pageNumber).padStart(2, '0')}
        </div>
      </div>

      <div className="grid h-[82.5%] min-h-0 grid-cols-[1.28fr_.72fr] gap-4">
        <div
          className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[22px] border p-2"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.surface,
          }}
          aria-busy={!illustration}
        >
          <div
            className="absolute -right-[17%] -top-[11%] h-[34%] w-[48%] rounded-full opacity-60"
            style={{ backgroundColor: theme.primarySoft }}
          />
          <div
            className="absolute -bottom-[12%] -left-[13%] h-[30%] w-[44%] rounded-full opacity-70"
            style={{ backgroundColor: theme.accentSoft }}
          />
          <div className="relative z-10 flex h-full w-full items-center justify-center p-1">
            {illustration ? (
              <img
                src={illustration}
                alt="Etapas do projeto fotovoltaico"
                className="max-h-full max-w-full object-contain object-center"
                draggable={false}
              />
            ) : (
              <div className="h-12 w-12 animate-pulse rounded-full" style={{ backgroundColor: theme.primarySoft }} />
            )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-col">
          <div
            className="absolute bottom-[19%] left-[15px] top-[24px] w-[2px]"
            style={{ backgroundColor: theme.border }}
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between">
            {steps.map(([number, title], index) => {
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
                <div key={title} className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-white text-[9px] font-black"
                    style={{
                      backgroundColor: color,
                      color: index === 1 ? theme.text : '#FFFFFF',
                    }}
                  >
                    {number}
                  </div>
                  <div
                    className="flex min-h-11 flex-1 items-center rounded-xl px-3 py-2 text-[9px] font-black"
                    style={{ backgroundColor: soft, color: theme.text }}
                  >
                    {title}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="mt-3 rounded-2xl p-3 text-[9px] font-semibold leading-relaxed"
            style={{ backgroundColor: theme.secondarySoft, color: theme.text }}
          >
            O cliente recebe orientações em cada etapa e é informado sobre prazos e dependências da distribuidora.
          </div>
        </div>
      </div>

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
