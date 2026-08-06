from pathlib import Path
import re


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if source.count(old) != 1:
        raise SystemExit(f'{label}: esperado exatamente 1 trecho, encontrado {source.count(old)}')
    return source.replace(old, new, 1)


repo = Path('.')

# Detecção robusta de toque: cobre celulares, tablets, iOS e dispositivos híbridos.
hook_path = repo / 'src/features/design-pdf/hooks/useTouchOnlyDevice.ts'
hook_path.write_text("""import { useEffect, useState } from 'react';

const TOUCH_CAPABILITY_MEDIA_QUERIES = [
  '(hover: none)',
  '(pointer: coarse)',
  '(any-pointer: coarse)',
] as const;

function hasTouchCapability() {
  if (typeof window === 'undefined') return false;

  const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const exposesTouchEvents = 'ontouchstart' in window;
  const matchesTouchMediaQuery = typeof window.matchMedia === 'function'
    && TOUCH_CAPABILITY_MEDIA_QUERIES.some((query) => window.matchMedia(query).matches);

  return hasTouchPoints || exposesTouchEvents || matchesTouchMediaQuery;
}

export function useTouchOnlyDevice() {
  const [isTouchOnlyDevice, setIsTouchOnlyDevice] = useState(hasTouchCapability);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQueries = TOUCH_CAPABILITY_MEDIA_QUERIES.map((query) => window.matchMedia(query));
    const syncDeviceCapability = () => setIsTouchOnlyDevice(hasTouchCapability());
    const unsubscribers = mediaQueries.map((mediaQuery) => {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', syncDeviceCapability);
        return () => mediaQuery.removeEventListener('change', syncDeviceCapability);
      }

      mediaQuery.addListener(syncDeviceCapability);
      return () => mediaQuery.removeListener(syncDeviceCapability);
    });

    syncDeviceCapability();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  return isTouchOnlyDevice;
}
""", encoding='utf-8')

# Modelos padrão: ação persistente no mobile, sem depender de hover ou segundo toque.
template_path = repo / 'src/features/design-pdf/components/TemplateCarousel.tsx'
template = template_path.read_text(encoding='utf-8')
template = replace_once(template, "import { useMemo, useState } from 'react';", "import { useMemo } from 'react';", 'import TemplateCarousel')
template = replace_once(template, "  const [openPresetId, setOpenPresetId] = useState<string | null>(null);\n", "", 'estado de ações do preset')
template = replace_once(
    template,
    "  const desktopRevealClassName = isTouchOnlyDevice\n    ? ''\n    : 'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';\n",
    "  const desktopActionsClassName = isTouchOnlyDevice ? 'hidden' : 'hidden md:flex';\n",
    'classe desktop do preset',
)
template = replace_once(
    template,
    "  const changeActiveIndex = (index: number) => {\n    setOpenPresetId(null);\n    onActiveIndexChange(index);\n  };",
    "  const changeActiveIndex = (index: number) => {\n    onActiveIndexChange(index);\n  };",
    'mudança de preset ativo',
)
template = replace_once(
    template,
    "  const handlePrev = () => changeActiveIndex(activeIndex === 0 ? presets.length - 1 : activeIndex - 1);",
    "  const activePreset = presets[activeIndex] ?? presets[0];\n\n  const handlePrev = () => changeActiveIndex(activeIndex === 0 ? presets.length - 1 : activeIndex - 1);",
    'preset ativo',
)
template = replace_once(template, "            const actionsAreOpen = openPresetId === preset.id;\n", "", 'actionsAreOpen preset')
old_template_handlers = """            const toggleMobileActions = () => {
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
"""
new_template_handlers = """            const handleCardClick = () => {
              if (!isActive) changeActiveIndex(index);
            };

            const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (!isActive) changeActiveIndex(index);
            };
"""
template = replace_once(template, old_template_handlers, new_template_handlers, 'handlers do preset')
old_template_aria = """                  isActive
                    ? isTouchOnlyDevice
                      ? `Modelo padrão ativo: ${preset.name}. Toque para mostrar ou ocultar a ação de adicionar.`
                      : `Modelo padrão ativo: ${preset.name}. Passe o mouse ou navegue com Tab para adicionar.`
                    : `Selecionar modelo padrão: ${preset.name}`
                }
                aria-current={isActive ? 'true' : undefined}
                aria-expanded={isActive && isTouchOnlyDevice ? actionsAreOpen : undefined}
"""
new_template_aria = """                  isActive
                    ? isTouchOnlyDevice
                      ? `Modelo padrão ativo: ${preset.name}. Use o botão Adicionar modelo abaixo da prévia.`
                      : `Modelo padrão ativo: ${preset.name}. Passe o mouse ou navegue com Tab para adicionar.`
                    : `Selecionar modelo padrão: ${preset.name}`
                }
                aria-current={isActive ? 'true' : undefined}
"""
template = replace_once(template, old_template_aria, new_template_aria, 'aria do preset')
old_template_overlay = """                      className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 ${desktopRevealClassName} ${
                        actionsAreOpen ? 'pointer-events-auto opacity-100' : ''
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isTouchOnlyDevice) closeActions();
                      }}
"""
new_template_overlay = """                      className={`pointer-events-none absolute inset-0 z-30 items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 ${desktopActionsClassName} group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100`}
                      onClick={(event) => event.stopPropagation()}
"""
template = replace_once(template, old_template_overlay, new_template_overlay, 'overlay desktop do preset')
template = replace_once(template, "                          closeActions();\n                          onAddFromPreset(preset.id);", "                          onAddFromPreset(preset.id);", 'ação adicionar no overlay')
mobile_template_actions = """
      {activePreset && (
        <div
          className={`${isTouchOnlyDevice ? 'flex' : 'flex md:hidden'} mt-4 justify-center px-3`}
          aria-label={`Ações do modelo padrão ${activePreset.name}`}
        >
          <button
            type="button"
            onClick={() => onAddFromPreset(activePreset.id)}
            className="flex min-h-12 w-full max-w-sm touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors active:bg-brand-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label={`Adicionar modelo ${activePreset.name}`}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Adicionar modelo
          </button>
        </div>
      )}

"""
template = replace_once(
    template,
    '      <div className="mt-2 flex justify-center gap-1" aria-label="Selecionar modelo padrão do PDF">',
    mobile_template_actions + '      <div className="mt-2 flex justify-center gap-1" aria-label="Selecionar modelo padrão do PDF">',
    'ações persistentes do preset',
)
template_path.write_text(template, encoding='utf-8')

# Modelos do usuário: barra persistente com rótulos e alvos de toque de 48px.
user_path = repo / 'src/features/design-pdf/components/UserModelCarousel.tsx'
user = user_path.read_text(encoding='utf-8')
user = replace_once(user, "import { useState } from 'react';\n", "", 'import UserModelCarousel')
user = replace_once(user, "  const [openActionsModelId, setOpenActionsModelId] = useState<string | null>(null);\n", "", 'estado de ações do modelo')
user = replace_once(
    user,
    "  const desktopRevealClassName = isTouchOnlyDevice\n    ? ''\n    : 'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';\n",
    "  const desktopActionsClassName = isTouchOnlyDevice ? 'hidden' : 'hidden md:flex';\n",
    'classe desktop do modelo',
)
user = replace_once(
    user,
    "  const changeActiveIndex = (index: number) => {\n    setOpenActionsModelId(null);\n    onActiveIndexChange(index);\n  };",
    "  const changeActiveIndex = (index: number) => {\n    onActiveIndexChange(index);\n  };",
    'mudança de modelo ativo',
)
user = replace_once(
    user,
    "  return (\n    <div className=\"relative mx-auto w-full max-w-[620px] px-0 py-4\">",
    "  const activeModel = userModels[activeIndex] ?? userModels[0];\n\n  return (\n    <div className=\"relative mx-auto w-full max-w-[620px] px-0 py-4\">",
    'modelo ativo',
)
user = replace_once(user, "            const actionsAreOpen = openActionsModelId === model.id;\n", "", 'actionsAreOpen modelo')
old_user_handlers = """            const toggleMobileActions = () => {
              if (!isTouchOnlyDevice) return;
              setOpenActionsModelId((current) => (current === model.id ? null : model.id));
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

            const closeActions = () => setOpenActionsModelId(null);
"""
new_user_handlers = """            const handleCardClick = () => {
              if (!isActive) changeActiveIndex(index);
            };

            const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              if (!isActive) changeActiveIndex(index);
            };
"""
user = replace_once(user, old_user_handlers, new_user_handlers, 'handlers do modelo')
old_user_aria = """                  isActive
                    ? isTouchOnlyDevice
                      ? `Modelo ativo: ${model.name}. Toque para mostrar ou ocultar as ações.`
                      : `Modelo ativo: ${model.name}. Passe o mouse ou navegue com Tab para acessar as ações.`
                    : `Selecionar modelo: ${model.name}`
                }
                aria-current={isActive ? 'true' : undefined}
                aria-expanded={isActive && isTouchOnlyDevice ? actionsAreOpen : undefined}
"""
new_user_aria = """                  isActive
                    ? isTouchOnlyDevice
                      ? `Modelo ativo: ${model.name}. Use os botões de ação abaixo da prévia.`
                      : `Modelo ativo: ${model.name}. Passe o mouse ou navegue com Tab para acessar as ações.`
                    : `Selecionar modelo: ${model.name}`
                }
                aria-current={isActive ? 'true' : undefined}
"""
user = replace_once(user, old_user_aria, new_user_aria, 'aria do modelo')
old_user_overlay = """                      className={`pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/85 opacity-0 transition-all duration-300 ${desktopRevealClassName} ${
                        actionsAreOpen ? 'pointer-events-auto opacity-100' : ''
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isTouchOnlyDevice) closeActions();
                      }}
"""
new_user_overlay = """                      className={`pointer-events-none absolute inset-0 z-30 flex-col items-center justify-center gap-3 bg-slate-950/85 opacity-0 transition-all duration-300 ${desktopActionsClassName} group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100`}
                      onClick={(event) => event.stopPropagation()}
"""
user = replace_once(user, old_user_overlay, new_user_overlay, 'overlay desktop do modelo')
user = user.replace("                            closeActions();\n", "")
mobile_user_actions = """
      {activeModel && (
        <div
          className={`${isTouchOnlyDevice ? 'grid' : 'grid md:hidden'} mt-4 grid-cols-2 gap-2 px-2`}
          aria-label={`Ações do modelo ${activeModel.name}`}
        >
          <button
            type="button"
            onClick={() => onEdit(activeModel)}
            className="flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand-blue px-3 py-3 text-sm font-bold text-white shadow-md active:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label={`Editar modelo ${activeModel.name}`}
          >
            <Edit2 className="h-5 w-5" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(activeModel.id)}
            className="flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl border border-brand-border bg-slate-800 px-3 py-3 text-sm font-bold text-slate-100 shadow-md active:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label={`Duplicar modelo ${activeModel.name}`}
          >
            <Copy className="h-5 w-5" aria-hidden="true" />
            Duplicar
          </button>
          {!activeModel.is_default ? (
            <button
              type="button"
              onClick={() => onSetDefault(activeModel.id)}
              className="flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-slate-800 px-3 py-3 text-sm font-bold text-amber-400 shadow-md active:bg-amber-500 active:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              aria-label={`Definir ${activeModel.name} como modelo padrão`}
            >
              <Star className="h-5 w-5" aria-hidden="true" />
              Tornar padrão
            </button>
          ) : (
            <div
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-500 px-3 py-3 text-sm font-bold text-slate-950 shadow-md"
              role="status"
              aria-label={`${activeModel.name} é o modelo padrão`}
            >
              <Star className="h-5 w-5 fill-current" aria-hidden="true" />
              Padrão atual
            </div>
          )}
          <button
            type="button"
            onClick={() => onDelete(activeModel.id)}
            className="flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-bold text-white shadow-md active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label={`Excluir modelo ${activeModel.name}`}
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Excluir
          </button>
        </div>
      )}

"""
user = replace_once(
    user,
    '      <div className="mt-2 flex justify-center gap-1" aria-label="Selecionar modelo do PDF">',
    mobile_user_actions + '      <div className="mt-2 flex justify-center gap-1" aria-label="Selecionar modelo do PDF">',
    'ações persistentes do modelo',
)
user_path.write_text(user, encoding='utf-8')

# Atualiza os contratos de regressão para a nova solução acessível.
test_path = repo / 'tests/empty-proposal-flow-cover-only.test.ts'
tests = test_path.read_text(encoding='utf-8')

def replace_test(source: str, name: str, replacement: str) -> str:
    pattern = re.compile(r"test\('" + re.escape(name) + r"'[\s\S]*?\n\}\);\n")
    updated, count = pattern.subn(replacement.rstrip() + '\n', source, count=1)
    if count != 1:
        raise SystemExit(f'Teste não encontrado: {name}')
    return updated

tests = replace_test(tests, 'ações dos modelos adicionados alternam por toque somente no mobile', """test('ações dos modelos permanecem acessíveis e clicáveis no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/UserModelCarousel.tsx');

  assert.match(carousel, /const activeModel = userModels\[activeIndex\] \?\? userModels\[0\]/);
  assert.match(carousel, /isTouchOnlyDevice \? 'grid' : 'grid md:hidden'/);
  assert.match(carousel, /desktopActionsClassName/);
  assert.match(carousel, /isTouchOnlyDevice \? 'hidden' : 'hidden md:flex'/);
  assert.match(carousel, /touch-manipulation/);
  assert.match(carousel, /min-h-12/);
  assert.match(carousel, />\s*Editar\s*</);
  assert.match(carousel, />\s*Duplicar\s*</);
  assert.match(carousel, />\s*Tornar padrão\s*</);
  assert.match(carousel, />\s*Excluir\s*</);
  assert.match(carousel, /Use os botões de ação abaixo da prévia/);
  assert.doesNotMatch(carousel, /aria-expanded/);
});
""")
tests = replace_test(tests, 'adicionar modelo padrão alterna por toque somente no mobile', """test('adicionar modelo padrão permanece acessível e clicável no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/TemplateCarousel.tsx');

  assert.match(carousel, /const activePreset = presets\[activeIndex\] \?\? presets\[0\]/);
  assert.match(carousel, /isTouchOnlyDevice \? 'flex' : 'flex md:hidden'/);
  assert.match(carousel, /desktopActionsClassName/);
  assert.match(carousel, /isTouchOnlyDevice \? 'hidden' : 'hidden md:flex'/);
  assert.match(carousel, /touch-manipulation/);
  assert.match(carousel, /min-h-12/);
  assert.match(carousel, /onAddFromPreset\(activePreset\.id\)/);
  assert.match(carousel, /Use o botão Adicionar modelo abaixo da prévia/);
  assert.doesNotMatch(carousel, /aria-expanded/);
});
""")
tests = replace_test(tests, 'detecção de mobile usa capacidade de toque em vez da largura da tela', """test('detecção de toque cobre celulares, tablets e dispositivos híbridos', async () => {
  const hook = await read('src/features/design-pdf/hooks/useTouchOnlyDevice.ts');

  assert.match(hook, /navigator\.maxTouchPoints > 0/);
  assert.match(hook, /'ontouchstart' in window/);
  assert.match(hook, /\(hover: none\)/);
  assert.match(hook, /\(pointer: coarse\)/);
  assert.match(hook, /\(any-pointer: coarse\)/);
  assert.match(hook, /addEventListener\('change'/);
  assert.match(hook, /removeEventListener\('change'/);
  assert.match(hook, /addListener\(syncDeviceCapability\)/);
  assert.match(hook, /removeListener\(syncDeviceCapability\)/);
});
""")
test_path.write_text(tests, encoding='utf-8')
