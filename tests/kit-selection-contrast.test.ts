import assert from 'node:assert/strict';
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
  assert.doesNotMatch(section, /bg-emerald-50\b/);
  assert.doesNotMatch(section, /bg-amber-50\b/);
  assert.doesNotMatch(section, /text-slate-600/);
  assert.doesNotMatch(section, /text-brand-blue/);
});

test('resumo lateral do kit também usa estados compatíveis com o tema escuro', async () => {
  const source = await readFile(CALCULATOR, 'utf8');
  const preview = source.slice(source.indexOf('function SizingPreview'));

  assert.match(preview, /border-emerald-400\/50 bg-emerald-500\/10 text-emerald-100/);
  assert.match(preview, /border-amber-400\/50 bg-amber-500\/10 text-amber-100/);
  assert.doesNotMatch(preview, /border-emerald-200 bg-emerald-50\b text-emerald-700/);
  assert.doesNotMatch(preview, /border-amber-200 bg-amber-50\b text-amber-800/);
});
