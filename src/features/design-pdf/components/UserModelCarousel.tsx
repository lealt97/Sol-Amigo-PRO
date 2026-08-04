import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { KeyboardEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit2,
  MoreHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { PdfUserModel } from '../types/pdfDesignTypes';
import { PdfPreview } from './PdfPreview';

interface UserModelCarouselProps {
  userModels: PdfUserModel[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onEdit: (model: PdfUserModel) => void;
  onDuplicate: (modelId: string) => void;
  onDelete: (modelId: string) => void;
  onSetDefault: (modelId: string) => void;
}

const menuItemClassName =
  'flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition-colors data-[highlighted]:bg-slate-700 data-[highlighted]:text-white data-[disabled]:cursor-default data-[disabled]:opacity-60';

const desktopActionButtonClassName =
  'flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

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
      <div className="rounded-xl border border-brand-border bg-brand-surface p-12 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-slate-500" />
        <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo adicionado</h3>
        <p className="mt-2 text-slate-500">Adicione um modelo padrão acima para começar a editar.</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[620px] px-0 py-4">
      <div className="relative flex h-[560px] select-none items-center justify-center">
        {userModels.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-0 top-1/2 z-40 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-slate-900/90 text-white shadow-lg transition-all hover:border-brand-primary hover:bg-brand-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              aria-label="Exibir modelo anterior"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-0 top-1/2 z-40 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-slate-900/90 text-white shadow-lg transition-all hover:border-brand-primary hover:bg-brand-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              aria-label="Exibir próximo modelo"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        <div className="relative flex h-full w-full items-center justify-center overflow-visible">
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

            const selectModelFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
              if (isActive || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              onActiveIndexChange(index);
            };

            return (
              <div
                key={model.id}
                onClick={() => !isActive && onActiveIndexChange(index)}
                onKeyDown={selectModelFromKeyboard}
                role={isActive ? 'group' : 'button'}
                tabIndex={isActive ? -1 : 0}
                aria-label={isActive ? `Modelo ativo: ${model.name}` : `Selecionar modelo: ${model.name}`}
                aria-current={isActive ? 'true' : undefined}
                style={{ zIndex: zIndexStyle }}
                className={`group absolute left-1/2 top-1/2 w-[240px] -translate-y-1/2 cursor-pointer select-none overflow-hidden rounded-xl border bg-brand-surface shadow-md transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${transformStyle} ${opacityStyle} ${
                  isActive
                    ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20'
                    : 'border-brand-border'
                }`}
              >
                {!isActive && <div className="absolute inset-0 z-20 bg-transparent" aria-hidden="true" />}

                <div className="relative aspect-[1/1.414] border-b border-brand-border bg-slate-950/40">
                  <PdfPreview model={model} isCardPreview />

                  {model.is_default && (
                    <div className="absolute left-2 top-2 z-10 rounded bg-amber-500 px-2 py-1 text-xs font-black text-slate-950 shadow-md">
                      Padrão
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 z-10 flex items-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4">
                    <h3 className="w-full truncate text-center text-base font-semibold text-white drop-shadow-md">
                      {model.name}
                    </h3>
                  </div>

                  {isActive && (
                    <div className="pointer-events-none absolute inset-0 z-30 hidden flex-col items-center justify-center gap-3 bg-slate-950/85 opacity-0 transition-all duration-300 md:flex md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(model);
                          }}
                          className={`${desktopActionButtonClassName} bg-brand-blue text-white hover:bg-brand-blue-hover`}
                          aria-label={`Editar modelo ${model.name}`}
                          title="Editar modelo"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDuplicate(model.id);
                          }}
                          className={`${desktopActionButtonClassName} border border-brand-border bg-slate-800 text-slate-100 hover:bg-slate-700`}
                          aria-label={`Duplicar modelo ${model.name}`}
                          title="Duplicar modelo"
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {!model.is_default ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSetDefault(model.id);
                            }}
                            className={`${desktopActionButtonClassName} border border-brand-border bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950`}
                            aria-label={`Definir ${model.name} como modelo padrão`}
                            title="Definir como padrão"
                          >
                            <Star className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : (
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400 bg-amber-500 text-slate-950 shadow-lg"
                            role="status"
                            aria-label={`${model.name} é o modelo padrão`}
                            title="Modelo padrão"
                          >
                            <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(model.id);
                          }}
                          className={`${desktopActionButtonClassName} bg-red-600 text-white hover:bg-red-700`}
                          aria-label={`Excluir modelo ${model.name}`}
                          title="Excluir modelo"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <span className="rounded border border-brand-border/45 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-300">
                        Ações do modelo
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex flex-col bg-gray-50/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Cores</span>
                    <div className="flex gap-1" aria-label="Paleta de cores do modelo">
                      <div
                        className="h-4 w-4 rounded-full border border-brand-border"
                        style={{ backgroundColor: model.theme.primary }}
                        title="Primária"
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-brand-border"
                        style={{ backgroundColor: model.theme.secondary }}
                        title="Secundária"
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-brand-border"
                        style={{ backgroundColor: model.theme.accent }}
                        title="Destaque"
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-brand-border"
                        style={{ backgroundColor: model.theme.neutral }}
                        title="Neutra"
                      />
                    </div>
                  </div>

                  {isActive && (
                    <div className="md:hidden">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-border bg-slate-900 px-3 text-sm font-bold text-white shadow-sm transition-colors hover:border-brand-primary hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                            aria-label={`Abrir ações do modelo ${model.name}`}
                          >
                            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                            Ações do modelo
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            sideOffset={8}
                            align="center"
                            collisionPadding={12}
                            className="z-[100] min-w-[220px] rounded-xl border border-brand-border bg-slate-900 p-2 shadow-2xl will-change-[transform,opacity] data-[state=closed]:animate-out data-[state=open]:animate-in"
                            aria-label={`Ações disponíveis para ${model.name}`}
                          >
                            <DropdownMenu.Label className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                              {model.name}
                            </DropdownMenu.Label>

                            <DropdownMenu.Item className={menuItemClassName} onSelect={() => onEdit(model)}>
                              <Edit2 className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                              Editar modelo
                            </DropdownMenu.Item>

                            <DropdownMenu.Item className={menuItemClassName} onSelect={() => onDuplicate(model.id)}>
                              <Copy className="h-5 w-5 text-slate-300" aria-hidden="true" />
                              Duplicar modelo
                            </DropdownMenu.Item>

                            {!model.is_default ? (
                              <DropdownMenu.Item className={menuItemClassName} onSelect={() => onSetDefault(model.id)}>
                                <Star className="h-5 w-5 text-amber-400" aria-hidden="true" />
                                Definir como padrão
                              </DropdownMenu.Item>
                            ) : (
                              <DropdownMenu.Item className={menuItemClassName} disabled>
                                <Star className="h-5 w-5 fill-current text-amber-400" aria-hidden="true" />
                                Modelo padrão
                              </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Separator className="my-2 h-px bg-brand-border" />

                            <DropdownMenu.Item
                              className={`${menuItemClassName} text-red-300 data-[highlighted]:bg-red-950 data-[highlighted]:text-red-100`}
                              onSelect={() => onDelete(model.id)}
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                              Excluir modelo
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-1" aria-label="Selecionar modelo do PDF">
        {userModels.map((model, index) => (
          <button
            type="button"
            key={model.id}
            onClick={() => onActiveIndexChange(index)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label={`Ir para o modelo ${model.name}`}
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
