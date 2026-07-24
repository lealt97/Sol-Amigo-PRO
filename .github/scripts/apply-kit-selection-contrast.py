from pathlib import Path

repo = Path('.')
calculator_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = calculator_path.read_text(encoding='utf-8')


def replace_once(old: str, new: str) -> None:
    global calculator
    if old not in calculator:
        raise SystemExit(f'Trecho esperado não encontrado:\n{old}')
    calculator = calculator.replace(old, new, 1)


replace_once(
    '''                  <h2 className="text-lg font-bold text-brand-dark">Seleção do kit cadastrado</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolha um kit on-grid ativo. Os módulos e o inversor já pertencem ao cadastro do kit.
                  </p>''',
    '''                  <h2 className="text-lg font-bold text-brand-dark">Seleção do kit cadastrado</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Escolha um kit on-grid ativo. Os módulos e o inversor já pertencem ao cadastro do kit.
                  </p>''',
)

replace_once(
    '''                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-brand-dark">Kit solar</span>
                    <Select
                      value={selectedKitId}''',
    '''                  <label className="block space-y-2 rounded-xl border border-brand-light/30 bg-brand-gray/70 p-4">
                    <span className="text-sm font-semibold text-brand-dark">Kit solar</span>
                    <Select
                      className="border-brand-light/50 bg-brand-gray text-brand-dark shadow-inner focus-visible:ring-brand-light"
                      value={selectedKitId}''',
)

replace_once(
    '''                      <Card className="shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Kit selecionado</p>''',
    '''                      <Card className="border-brand-light/30 bg-brand-gray/70 shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-light">Kit selecionado</p>''',
)

replace_once(
    '''                      <Card className={`shadow-none ${result.selectedKitIsAdequate ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/60'}`}>''',
    '''                      <Card className={`shadow-none ${result.selectedKitIsAdequate ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-amber-400/50 bg-amber-500/10'}`}>''',
)

replace_once(
    '''                              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />''',
    '''                              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />''',
)

replace_once(
    '''                              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />''',
    '''                              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />''',
)

replace_once(
    '''                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                Necessário: {number.format(result.requiredPowerKwp)} kWp. Selecionado: {number.format(selectedKit.kit_power_kwp)} kWp.
                              </p>''',
    '''                              <p className="mt-1 text-sm leading-6 text-slate-200">
                                Necessário: {number.format(result.requiredPowerKwp)} kWp. Selecionado: {number.format(selectedKit.kit_power_kwp)} kWp.
                              </p>''',
)

replace_once(
    '''                        selectedKitOversizing.status === 'reference'
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : selectedKitOversizing.status === 'above_reference'
                            ? 'border-amber-200 bg-amber-50/70'
                            : 'border-brand-blue/20 bg-brand-blue/5' ''',
    '''                        selectedKitOversizing.status === 'reference'
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : selectedKitOversizing.status === 'above_reference'
                            ? 'border-amber-400/50 bg-amber-500/10'
                            : 'border-brand-light/30 bg-brand-blue/10' ''',
)

replace_once(
    '''                            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />''',
    '''                            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />''',
)

replace_once(
    '''                            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />''',
    '''                            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />''',
)

replace_once(
    '''                            <Gauge className="mt-0.5 h-6 w-6 shrink-0 text-brand-blue" />''',
    '''                            <Gauge className="mt-0.5 h-6 w-6 shrink-0 text-brand-light" />''',
)

replace_once(
    '''                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Oversizing DC/AC</p>
                            <h3 className="mt-1 text-lg font-bold text-brand-dark">{selectedKitOversizing.statusLabel}</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{selectedKitOversizing.guidance}</p>''',
    '''                            <p className="text-xs font-bold uppercase tracking-wider text-brand-light">Oversizing DC/AC</p>
                            <h3 className="mt-1 text-lg font-bold text-brand-dark">{selectedKitOversizing.statusLabel}</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-200">{selectedKitOversizing.guidance}</p>''',
)

replace_once(
    '''                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-amber-800">''',
    '''                      <div className="flex items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-5 text-amber-100">''',
)

replace_once(
    '''                    <div className="rounded-xl border border-brand-border bg-brand-gray/40 p-4 text-sm text-slate-600">''',
    '''                    <div className="rounded-xl border border-brand-light/20 bg-brand-gray/70 p-4 text-sm text-slate-200">''',
)

replace_once(
    '''                        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />''',
    '''                        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />''',
)

replace_once(
    '''              result.selectedKitIsAdequate
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-800' ''',
    '''              result.selectedKitIsAdequate
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                : 'border-amber-400/50 bg-amber-500/10 text-amber-100' ''',
)

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

  assert.match(source, /Kit compatível com a potência calculada\.[\s\S]*bg-emerald-500\/10|bg-emerald-500\/10[\s\S]*Kit compatível com a potência calculada\./);
  assert.match(source, /Kit abaixo da potência calculada\.[\s\S]*bg-amber-500\/10|bg-amber-500\/10[\s\S]*Kit abaixo da potência calculada\./);
});
""", encoding='utf-8')
