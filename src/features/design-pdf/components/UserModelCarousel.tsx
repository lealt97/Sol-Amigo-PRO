import { ChevronLeft, ChevronRight, Copy, Edit2, Star, Trash2 } from 'lucide-react';
import { PdfUserModel } from '../types/pdfDesignTypes';
import { PdfPreview } from './PdfPreview';
import { Button } from '../../../components/ui/Button';

interface UserModelCarouselProps {
  userModels: PdfUserModel[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onEdit: (model: PdfUserModel) => void;
  onDuplicate: (modelId: string) => void;
  onDelete: (modelId: string) => void;
  onSetDefault: (modelId: string) => void;
}

export function UserModelCarousel({
  userModels,
  activeIndex,
  onActiveIndexChange,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: UserModelCarouselProps) {
  const handlePrev = () => onActiveIndexChange(activeIndex === 0 ? userModels.length - 1 : activeIndex - 1);
  const handleNext = () => onActiveIndexChange(activeIndex === userModels.length - 1 ? 0 : activeIndex + 1);

  if (userModels.length === 0) {
    return (
      <div className="text-center p-12 bg-brand-surface border border-brand-border rounded-xl">
        <Star className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo adicionado</h3>
        <p className="text-slate-500 mt-2">Adicione um modelo padrão acima para começar a editar.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[620px] mx-auto py-4 px-0">
      <div className="relative h-[560px] select-none flex items-center justify-center">
        {userModels.length > 1 && (
          <>
            <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none" aria-label="Anterior">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none" aria-label="Próximo">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
          {userModels.map((model, index) => {
            const length = userModels.length || 1;
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
              <div key={model.id} onClick={() => !isActive && onActiveIndexChange(index)} style={{ zIndex: zIndexStyle }} className={`absolute left-1/2 top-1/2 -translate-y-1/2 w-[240px] group bg-brand-surface border rounded-xl overflow-hidden shadow-md transition-all duration-500 ease-out cursor-pointer select-none ${transformStyle} ${opacityStyle} ${isActive ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20' : 'border-brand-border'}`}>
                {/* Transparent Overlay for inactive cards to handle click-to-focus safely */}
                {!isActive && (
                  <div className="absolute inset-0 z-20 bg-transparent" />
                )}
                
                <div className="aspect-[1/1.414] bg-slate-950/40 relative border-b border-brand-border">
                  <PdfPreview model={model} isCardPreview />
                  
                  {model.is_default && (
                    <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-xs font-black px-2 py-1 rounded shadow-md">
                      Padrão
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-end p-4 z-10 pointer-events-none">
                    <h3 className="font-semibold text-white truncate text-base drop-shadow-md w-full text-center">{model.name}</h3>
                  </div>

                  {/* Hover Actions Overlay */}
                  {isActive && (
                    <div className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 z-30 pointer-events-none group-hover:pointer-events-auto">
                      <div className="flex gap-2 items-center justify-center">
                        {/* Editar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(model);
                          }}
                          className="w-10 h-10 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                          title="Editar Modelo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Duplicar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(model.id);
                          }}
                          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center border border-brand-border shadow-lg transition-all hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                          title="Duplicar Modelo"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {/* Padrão */}
                        {!model.is_default ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetDefault(model.id);
                            }}
                            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 flex items-center justify-center border border-brand-border shadow-lg transition-all hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                            title="Definir como Padrão"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg border border-amber-400"
                            title="Modelo Ativo (Padrão)"
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </div>
                        )}
                        {/* Excluir */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(model.id);
                          }}
                          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                          title="Excluir Modelo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <span className="text-[10px] text-slate-300 font-medium tracking-wide bg-slate-900/80 px-2 py-0.5 rounded border border-brand-border/45">
                        Ações do Modelo
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50/20 flex flex-col mt-auto">
                  {/* Color Palettes */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Cores</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.primary }} title="Primária" />
                      <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.secondary }} title="Secundária" />
                      <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.accent }} title="Destaque" />
                      <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.neutral }} title="Neutra" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-2">
        {userModels.map((_, index) => (
          <button key={index} onClick={() => onActiveIndexChange(index)} className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${index === activeIndex ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-600 hover:bg-slate-400'}`} aria-label={`Ir para modelo ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
