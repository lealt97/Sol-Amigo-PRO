from pathlib import Path
import re
import subprocess

repo = Path('.')
source_commit = '0e1007e885619814810dd2cac025248dd01e2baa'


def restore(path: str) -> str:
    result = subprocess.run(
        ['git', 'show', f'{source_commit}:{path}'],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 trecho, encontrado {count}')
    return source.replace(old, new, 1)


# Restaura exatamente o layout anterior dos controles sobre a miniatura.
template_path = repo / 'src/features/design-pdf/components/TemplateCarousel.tsx'
template = restore(str(template_path))
template = replace_once(
    template,
    "  const desktopRevealClassName = isTouchOnlyDevice\n    ? ''\n    : 'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';",
    "  const desktopRevealClassName = isTouchOnlyDevice\n    ? ''\n    : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';",
    'classes desktop do modelo padrão',
)
template = replace_once(
    template,
    """                      className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 ${desktopRevealClassName} ${
                        actionsAreOpen ? 'pointer-events-auto opacity-100' : ''
                      }`}
                      onClick={(event) => {
""",
    """                      className={`absolute inset-0 z-30 flex items-center justify-center bg-black/60 transition-opacity duration-300 ${desktopRevealClassName}`}
                      style={isTouchOnlyDevice ? {
                        pointerEvents: actionsAreOpen ? 'auto' : 'none',
                        opacity: actionsAreOpen ? 1 : 0,
                      } : undefined}
                      onClick={(event) => {
""",
    'visibilidade tocável do overlay do modelo padrão',
)
template_path.write_text(template, encoding='utf-8')

user_path = repo / 'src/features/design-pdf/components/UserModelCarousel.tsx'
user = restore(str(user_path))
user = replace_once(
    user,
    "  const desktopRevealClassName = isTouchOnlyDevice\n    ? ''\n    : 'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';",
    "  const desktopRevealClassName = isTouchOnlyDevice\n    ? ''\n    : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';",
    'classes desktop dos modelos do usuário',
)
user = replace_once(
    user,
    """                      className={`pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/85 opacity-0 transition-all duration-300 ${desktopRevealClassName} ${
                        actionsAreOpen ? 'pointer-events-auto opacity-100' : ''
                      }`}
                      onClick={(event) => {
""",
    """                      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/85 transition-all duration-300 ${desktopRevealClassName}`}
                      style={isTouchOnlyDevice ? {
                        pointerEvents: actionsAreOpen ? 'auto' : 'none',
                        opacity: actionsAreOpen ? 1 : 0,
                      } : undefined}
                      onClick={(event) => {
""",
    'visibilidade tocável do overlay dos modelos do usuário',
)
user_path.write_text(user, encoding='utf-8')

# Atualiza apenas os contratos relacionados, sem alterar os demais testes do projeto.
test_path = repo / 'tests/empty-proposal-flow-cover-only.test.ts'
tests = test_path.read_text(encoding='utf-8')


def replace_test(source: str, current_name: str, replacement: str) -> str:
    pattern = re.compile(r"test\('" + re.escape(current_name) + r"'[\s\S]*?\n\}\);\n")
    updated, count = pattern.subn(lambda _: replacement.rstrip() + '\n', source, count=1)
    if count != 1:
        raise SystemExit(f'Teste não encontrado: {current_name}')
    return updated


tests = replace_test(
    tests,
    'ações dos modelos permanecem acessíveis e clicáveis no mobile',
    r"""test('ações dos modelos mantêm o overlay original e aceitam toque no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/UserModelCarousel.tsx');

  assert.match(carousel, /useState<string \| null>\(null\)/);
  assert.match(carousel, /current === model\.id \? null : model\.id/);
  assert.match(carousel, /onClick=\{handleCardClick\}/);
  assert.match(carousel, /pointerEvents: actionsAreOpen \? 'auto' : 'none'/);
  assert.match(carousel, /opacity: actionsAreOpen \? 1 : 0/);
  assert.match(carousel, /style=\{isTouchOnlyDevice \?/);
  assert.match(carousel, /Editar modelo/);
  assert.match(carousel, /Duplicar modelo/);
  assert.match(carousel, /Excluir modelo/);
  assert.match(carousel, /aria-expanded=\{isActive && isTouchOnlyDevice/);
  assert.doesNotMatch(carousel, /const activeModel =/);
  assert.doesNotMatch(carousel, /Tornar padrão/);
});
""",
)

tests = replace_test(
    tests,
    'adicionar modelo padrão permanece acessível e clicável no mobile',
    r"""test('adicionar modelo mantém o overlay original e aceita toque no mobile', async () => {
  const carousel = await read('src/features/design-pdf/components/TemplateCarousel.tsx');

  assert.match(carousel, /useState<string \| null>\(null\)/);
  assert.match(carousel, /current === preset\.id \? null : preset\.id/);
  assert.match(carousel, /onClick=\{handleCardClick\}/);
  assert.match(carousel, /pointerEvents: actionsAreOpen \? 'auto' : 'none'/);
  assert.match(carousel, /opacity: actionsAreOpen \? 1 : 0/);
  assert.match(carousel, /style=\{isTouchOnlyDevice \?/);
  assert.match(carousel, /Adicionar modelo/);
  assert.match(carousel, /aria-expanded=\{isActive && isTouchOnlyDevice/);
  assert.doesNotMatch(carousel, /const activePreset =/);
  assert.doesNotMatch(carousel, /max-w-sm touch-manipulation/);
});
""",
)

test_path.write_text(tests, encoding='utf-8')
