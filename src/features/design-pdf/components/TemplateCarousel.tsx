import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, LayoutTemplate, Plus } from 'lucide-react';
import { PdfTemplatePreset } from '../types/pdfDesignTypes';
import { buildSvgTemplate } from '../engines/svgTemplateEngine';
import { useTouchOnlyDevice } from '../hooks/useTouchOnlyDevice';

interface TemplateCarouselProps {
  presets: PdfTemplatePreset[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onAddFromPreset: (presetId: string) => void;
}

function buildCorrectedPresetPreviews(presets: PdfTemplatePreset[]) {
  const previews = new Map<string, string>();

  presets.forEach((preset) => {
    if (preset.id !== 'preset-4' || !preset.svg_content) return;

    try {
      previews.set(
        preset.id,
        buildSvgTemplate({
          svgSource: preset.svg_content,
          theme: {
            current: preset.default_theme,
            original: preset.default_theme,
          },
          modelId: `standard-preview-${preset.id}`,
        }),
      );
    } catch {
      // A miniatura original continua disponível como fallback.
    }
  });

  return previews;
}

export function TemplateCarousel({ presets, activeIndex, onActiveIndexChange, onAddFromPreset }: TemplateCarouselProps) {
  const [openPresetId, setOpenPresetId] = useState<string | null>(null);
  const isTouchOnlyDevice = useTouchOnlyDevice();
  const desktopRevealClassName = isTouchOnlyDevice
    ? ''
    : 'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';
  const correctedPresetPreviews = useMemo(
    () => buildCorrectedPresetPreviews(presets),
    [presets],
  );

  const changeActiveIndex = (index: number) => {
    setOpenPresetId(null);
    onActiveIndexChange(index);
  };

  if (presets.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-12 text-center">
        <LayoutTemplate className="mx-auto mb-4 h-12 w-12 text-slate-500" />
        <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo padrão encontrado</h3>
        <p className="mt-2 text-slate-500">Verifique os presets SVG cadastrados em public/pdf-assets/covers.</p>
      </div>
    );
  }

  const handlePrev = () => changeActiveIndex(activeIndex === 0 ? presets.length - 1 : activeIndex - 1);
  const handleNext = () => changeActiveIndex(activeIndex === presets.length - 1 ? 0 : activeIndex + 1);

  return (
    <div className="relative mx-auto w-full max-w-[620px] px-0 py-4">
      <div className="relative flex h-[460px] select-none items-center justify-center">
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-0 top-1/2 z-40 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-slate-900/90 text-white shadow-lg transition-all hover:border-brand-primary hover:bg-brand-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Exibir modelo padrão anterior"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-0 top-1/2 z-40 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-slate-900/90 text-white shadow-lg transition-all hover:border-brand-primary hover:bg-brand-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Exibir próximo modelo padrão"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative flex h-full w-full items-center justify-center overflow-visible">
          {presets.map((preset, index) => {
            const length = presets.length;
            let diff = index - activeIndex;
            if (diff < -length / 2) diff += length;
            if (diff > length / 2) diff -= length;
            if (Math.abs(diff) > 2) return null;

            const isActive = index === activeIndex;
            const actionsAreOpen = openPresetId === preset.id;
            const correctedPreview = correctedPresetPreviews.get(preset.id);
            let transformStyle = '';
            let opacityStyle = '';
            let zIndexStyle = 10;

            if (diff === 0) {
              transformStyle = 'translate-x-[-50%] scale-[1.05]';
              opacityStyle = 'opacity-100';
              zIndexStyle = 30;
            } else if (diff === -1) {
              transformStyle = 'translate-x-[-135%] scale-[0.85]';
              opacityStyle = 'opacity-60';
              zIndexStyle = 20;
            } else if (diff === 1) {
              transformStyle = 'translate-x-[35%] scale-[0.85]';
              opacityStyle = 'opacity-60';
              zIndexStyle = 20;
            } else if (diff === -2) {
              transformStyle = 'translate-x-[-210%] scale-[0.7] opacity-0 pointer-events-none';
              opacityStyle = 'opacity-0';
            } else if (diff === 2) {
              transformStyle = 'translate-x-[110%] scale-[0.7] opacity-0 pointer-events-none';
              opacityStyle = 'opacity-0';
            }

            const toggleMobileActions = () => {
              if (!isTouchOnlyDevice) return;
              setOpenPresetId((current) => (current === preset.id ? null : preset.id));
            };

            const handleCardClick = () => {
              if (!isActive) {
                changeActiveIndex(index);
                return;
              }

              toggleMobileActions();
            };

            const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();

              if (!isActive) {
                changeActiveIndex(index);
                return;
              }

              toggleMobileActions();
            };

            const closeActions = () => setOpenPresetId(null);

            return (
              <div
                key={preset.id}
                onClick={handleCardClick}
                onKeyDown={handleCardKeyDown}
                role="group"
                tabIndex={0}
                aria-label={
                  isActive
                    ? isTouchOnlyDevice
                      ? `Modelo padrão ativo: ${preset.name}. Toque para mostrar ou ocultar a ação de adicionar.`
                      : `Modelo padrão ativo: ${preset.name}. Passe o mouse ou navegue com Tab para adicionar.`
                    : `Selecionar modelo padrão: ${preset.name}`
                }
                aria-current={isActive ? 'true' : undefined}
                aria-expanded={isActive && isTouchOnlyDevice ? actionsAreOpen : undefined}
                style={{ zIndex: zIndexStyle }}
                className={`group absolute left-1/2 top-1/2 w-[240px] -translate-y-1/2 cursor-pointer select-none overflow-hidden rounded-xl border bg-brand-surface shadow-md transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${transformStyle} ${opacityStyle} ${
                  isActive
                    ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20'
                    : 'border-brand-border'
                }`}
              >
                {!isActive && <div className="absolute inset-0 z-20 bg-transparent" aria-hidden="true" />}

                <div className="relative aspect-[1/1.414] bg-slate-950/40">
                  {correctedPreview ? (
                    <div
                      className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                      aria-label={preset.name}
                      role="img"
                      dangerouslySetInnerHTML={{ __html: correctedPreview }}
                    />
                  ) : preset.thumbnail_url ? (
                    <img src={preset.thumbnail_url} alt={preset.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">Sem miniatura</div>
                  )}

                  {isActive && (
                    <div
                      className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 ${desktopRevealClassName} ${
                        actionsAreOpen ? 'pointer-events-auto opacity-100' : ''
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isTouchOnlyDevice) closeActions();
                      }}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          closeActions();
                          onAddFromPreset(preset.id);
                        }}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        aria-label={`Adicionar modelo ${preset.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Adicionar modelo
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-border bg-gray-50/20 p-4">
                  <h3 className={`truncate text-center text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {preset.name}
                  </h3>
                  <div className="mt-3 flex justify-center gap-2" aria-label="Paleta de cores do modelo padrão">
                    <div className="h-5 w-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.primary }} title="Primária" />
                    <div className="h-5 w-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.secondary }} title="Secundária" />
                    <div className="h-5 w-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.accent }} title="Destaque" />
                    <div className="h-5 w-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.neutral }} title="Neutra" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-1" aria-label="Selecionar modelo padrão do PDF">
        {presets.map((preset, index) => (
          <button
            type="button"
            key={preset.id}
            onClick={() => changeActiveIndex(index)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label={`Ir para o modelo padrão ${preset.name}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-600 hover:bg-slate-400'
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
