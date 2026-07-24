from pathlib import Path

repo = Path('.')
calculator_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = calculator_path.read_text(encoding='utf-8')

section_start = calculator.index('            {currentStep === 4')
section_end = calculator.index('            {currentStep === 5', section_start)
section = calculator[section_start:section_end]

replacements = [
    ('text-slate-500', 'text-slate-300'),
    ('className="block space-y-2"', 'className="block space-y-2 rounded-xl border border-brand-light/30 bg-brand-gray/70 p-4"'),
    ('<Select\n                      value={selectedKitId}', '<Select\n                      className="border-brand-light/50 bg-brand-gray text-brand-dark shadow-inner focus-visible:ring-brand-light"\n                      value={selectedKitId}'),
    ('<Card className="shadow-none">', '<Card className="border-brand-light/30 bg-brand-gray/70 shadow-none">'),
    ('text-brand-blue">Kit selecionado', 'text-brand-light">Kit selecionado'),
    ("'border-emerald-200 bg-emerald-50/50'", "'border-emerald-400/50 bg-emerald-500/10'"),
    ("'border-amber-200 bg-amber-50/60'", "'border-amber-400/50 bg-amber-500/10'"),
    ('text-emerald-600', 'text-emerald-300'),
    ('text-amber-600', 'text-amber-300'),
    ('text-slate-600', 'text-slate-200'),
    ("'border-emerald-200 bg-emerald-50/60'", "'border-emerald-400/50 bg-emerald-500/10'"),
    ("'border-amber-200 bg-amber-50/70'", "'border-amber-400/50 bg-amber-500/10'"),
    ("'border-brand-blue/20 bg-brand-blue/5'", "'border-brand-light/30 bg-brand-blue/10'"),
    ('text-brand-blue', 'text-brand-light'),
    ('border-amber-200 bg-amber-50/70 p-5 text-amber-800', 'border-amber-400/50 bg-amber-500/10 p-5 text-amber-100'),
    ('border-brand-border bg-brand-gray/40 p-4 text-sm text-slate-200', 'border-brand-light/20 bg-brand-gray/70 p-4 text-sm text-slate-200'),
]

for old, new in replacements:
    if old not in section:
        raise SystemExit(f'Trecho esperado não encontrado na seleção do kit: {old}')
    section = section.replace(old, new, 1)

calculator = calculator[:section_start] + section + calculator[section_end:]

preview_start = calculator.index('function SizingPreview')
preview = calculator[preview_start:]
preview_replacements = [
    ("'border-emerald-200 bg-emerald-50 text-emerald-700'", "'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'"),
    ("'border-amber-200 bg-amber-50 text-amber-800'", "'border-amber-400/50 bg-amber-500/10 text-amber-100'"),
]

for old, new in preview_replacements:
    if old not in preview:
        raise SystemExit(f'Trecho esperado não encontrado no resumo lateral: {old}')
    preview = preview.replace(old, new, 1)

calculator = calculator[:preview_start] + preview
calculator_path.write_text(calculator, encoding='utf-8')

test_path = repo / 'tests/kit-selection-contrast.test.ts'
test_path.write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('seleção do kit usa superfícies e textos com contraste no tema escuro', async () => {
  const source = await readFile(CALCULATOR, 'utf8');
  const start = source.indexOf('{currentStep === 4');
  const end = source.indexOf('{currentStep === 5');

  assert.ok(start >= 0 && end > start, 'Etapa de seleção do kit não encontrada.');
  const section = source.slice(start, end);

  assert.match(section, /text-slate-300/);
  assert.match(section, /border-brand-light\/30 bg-brand-gray\/70 p-4/);
  assert.match(section, /border-brand-light\/50 bg-brand-gray text-brand-dark/);
  assert.match(section, /bg-emerald-500\/10/);
  assert.match(section, /bg-amber-500\/10/);
  assert.match(section, /text-slate-200/);
  assert.match(section, /text-amber-100/);
  assert.match(section, /text-brand-light/);
  assert.doesNotMatch(section, /bg-emerald-50/);
  assert.doesNotMatch(section, /bg-amber-50/);
  assert.doesNotMatch(section, /text-slate-600/);
});

test('resumo lateral do kit também usa estados compatíveis com o tema escuro', async () => {
  const source = await readFile(CALCULATOR, 'utf8');
  const preview = source.slice(source.indexOf('function SizingPreview'));

  assert.match(preview, /border-emerald-400\/50 bg-emerald-500\/10 text-emerald-100/);
  assert.match(preview, /border-amber-400\/50 bg-amber-500\/10 text-amber-100/);
  assert.doesNotMatch(preview, /border-emerald-200 bg-emerald-50 text-emerald-700/);
  assert.doesNotMatch(preview, /border-amber-200 bg-amber-50 text-amber-800/);
});
""", encoding='utf-8')
