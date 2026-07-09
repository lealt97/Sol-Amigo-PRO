import { ChevronLeft, ChevronRight, LayoutTemplate, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PdfTemplatePreset } from '../types/pdfDesignTypes';

interface TemplateCarouselProps {
  presets: PdfTemplatePreset[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onAddFromPreset: (presetId: string) => void;
}

export function TemplateCarousel({ presets, activeIndex, onActiveIndexChange, onAddFromPreset }: TemplateCarouselProps) {
  if (presets.length === 0) {
    return (
      <div className="text-center p-12 bg-brand-surface border border-brand-border rounded-xl">
        <LayoutTemplate className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo padrão encontrado</h3>
        <p className="text-slate-500 mt-2">Verifique os presets SVG cadastrados em public/pdf-assets/covers.</p>
      </div>
    );
  }

  const handlePrev = () => onActiveIndexChange(activeIndex === 0 ? presets.length - 1 : activeIndex - 1);
  const handleNext = () => onActiveIndexChange(activeIndex === presets.length - 1 ? 0 : activeIndex + 1);

  return (
    <div className="relative w-full max-w-[620px] mx-auto py-4 px-0">
      <div className="relative h-[460px] select-none flex items-center justify-center">
        <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none" aria-label="Anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none" aria-label="Próximo">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
          {presets.map((preset, index) => {
            const length = presets.length;
            let diff = index - activeIndex;
            if (diff < -length / 2) diff += length;
            if (diff > length / 2) diff -= length;
            if (Math.abs(diff) > 2) return null;

            const isActive = index === activeIndex;
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

            return (
              <div key={preset.id} onClick={() => !isActive && onActiveIndexChange(index)} style={{ zIndex: zIndexStyle }} className={`absolute left-1/2 top-1/2 -translate-y-1/2 w-[240px] group bg-brand-surface border rounded-xl overflow-hidden shadow-md transition-all duration-500 ease-out cursor-pointer select-none ${transformStyle} ${opacityStyle} ${isActive ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20' : 'border-brand-border'}`}>
                <div className="aspect-[1/1.414] bg-slate-950/40 relative">
                  {preset.thumbnail_url ? <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400">Sem miniatura</div>}
                  {isActive && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button onClick={(event) => { event.stopPropagation(); onAddFromPreset(preset.id); }} className="gap-2 font-semibold shadow-md">
                        <Plus className="w-4 h-4" /> Adicionar Modelo
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-brand-border bg-gray-50/20">
                  <h3 className={`font-semibold transition-colors duration-300 truncate text-sm text-center ${isActive ? 'text-white' : 'text-slate-400'}`}>{preset.name}</h3>
                  <div className="flex gap-2 mt-3 justify-center">
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.primary }} title="Primária" />
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.secondary }} title="Secundária" />
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.accent }} title="Destaque" />
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.neutral }} title="Neutra" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-2">
        {presets.map((_, index) => (
          <button key={index} onClick={() => onActiveIndexChange(index)} className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${index === activeIndex ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-600 hover:bg-slate-400'}`} aria-label={`Ir para slide ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
