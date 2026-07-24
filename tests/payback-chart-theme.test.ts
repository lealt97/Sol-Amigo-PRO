import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const THEME = 'src/lib/theme/platformTheme.ts';
const PAYBACK = 'src/pages/propostas/PaybackStep.tsx';

test('motor de cores cria papéis semânticos para gráficos', async () => {
  const source = await readFile(THEME, 'utf8');

  for (const role of [
    'chartPositive',
    'chartNegative',
    'chartGrid',
    'chartAxis',
    'chartZero',
    'chartCursor',
    'chartTooltipBg',
    'chartTooltipBorder',
    'chartTooltipText',
    'chartTooltipMuted',
    'chartPanel',
    'chartMarker',
    'chartMarkerBg',
  ]) {
    assert.match(source, new RegExp(`${role}: string`));
  }

  assert.match(source, /chartPositive: normalizedSeed\.primary/);
  assert.match(source, /chartNegative: normalizedSeed\.warning/);
  assert.match(source, /const activeTheme = buildPlatformTheme\(theme\?\.seed \|\| DEFAULT_PLATFORM_THEME_SEED\)/);
  assert.match(source, /setCssVar\('--color-chart-grid', palette\.chartGrid\)/);
  assert.match(source, /setCssVar\('--color-chart-tooltip-bg', palette\.chartTooltipBg\)/);
  assert.match(source, /setCssVar\('--color-chart-marker', palette\.chartMarker\)/);
});

test('gráfico de payback consome a paleta semântica em todos os elementos', async () => {
  const source = await readFile(PAYBACK, 'utf8');
  const titleIndex = source.indexOf('Saldo acumulado em 25 anos');
  const start = source.lastIndexOf('          <Card\n', titleIndex);
  const end = source.indexOf('</Card>', titleIndex);

  assert.ok(titleIndex >= 0 && start >= 0 && end > titleIndex, 'Gráfico de payback não encontrado.');
  const chart = source.slice(start, end);

  for (const cssVariable of [
    '--color-chart-panel',
    '--color-chart-grid',
    '--color-chart-axis',
    '--color-chart-zero',
    '--color-chart-cursor',
    '--color-chart-tooltip-bg',
    '--color-chart-tooltip-border',
    '--color-chart-tooltip-text',
    '--color-chart-tooltip-muted',
    '--color-chart-positive',
    '--color-chart-negative',
    '--color-chart-marker',
    '--color-chart-marker-bg',
  ]) {
    assert.match(chart, new RegExp(cssVariable));
  }

  assert.match(source, /const paybackMarkerYear =/);
  assert.match(chart, /value: 'Payback'/);
  assert.match(chart, /Capital não recuperado/);
  assert.match(chart, /Retorno acumulado/);
  assert.match(chart, /Marco do payback/);
});
