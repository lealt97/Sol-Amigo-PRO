import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  resolveCoverPaint,
  type CoverTheme,
} from '../src/features/design-pdf/engines/colorEngine';

type ParsedPreset = {
  id: string;
  theme: CoverTheme['current'];
};

const PRESETS_PATH = 'src/services/pdfA4Presets.ts';
const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const CURRENT_THEME: CoverTheme['current'] = {
  primary: '#123456',
  secondary: '#654321',
  accent: '#ABCDEF',
  neutral: '#243B53',
};

async function parsePresets(): Promise<ParsedPreset[]> {
  const source = await readFile(PRESETS_PATH, 'utf8');
  const pattern = /id:\s*'([^']+)'[\s\S]*?default_theme:\s*\{\s*primary:\s*'([^']+)',\s*secondary:\s*'([^']+)',\s*accent:\s*'([^']+)',\s*neutral:\s*'([^']+)'\s*\}/g;
  const presets: ParsedPreset[] = [];

  for (const match of source.matchAll(pattern)) {
    presets.push({
      id: match[1],
      theme: {
        primary: match[2],
        secondary: match[3],
        accent: match[4],
        neutral: match[5],
      },
    });
  }

  return presets;
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = hex.slice(1);
  const channels = [0, 2, 4].map((index) => (
    channelToLinear(Number.parseInt(value.slice(index, index + 2), 16))
  ));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(left: string, right: string) {
  const [lighter, darker] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('cadastro mantém os 12 modelos com quatro cores de paleta válidas', async () => {
  const presets = await parsePresets();

  assert.equal(presets.length, 12);
  assert.deepEqual(
    presets.map((preset) => preset.id),
    Array.from({ length: 12 }, (_, index) => `preset-${index + 1}`),
  );

  for (const preset of presets) {
    for (const [role, color] of Object.entries(preset.theme)) {
      assert.match(color, HEX_COLOR, `${preset.id}: ${role} não é uma cor hexadecimal válida`);
    }
  }
});

test('cada cor das paletas possui contraste AA com branco ou preto neutro', async () => {
  const presets = await parsePresets();

  for (const preset of presets) {
    for (const [role, color] of Object.entries(preset.theme)) {
      const bestStaticContrast = Math.max(
        contrastRatio(color, '#FFFFFF'),
        contrastRatio(color, '#000000'),
      );
      assert.ok(
        bestStaticContrast >= 4.5,
        `${preset.id}: ${role} não possui opção estática de contraste AA`,
      );
    }
  }
});

test('motor preserva o papel de cada cor original ao aplicar outra paleta', async () => {
  const presets = await parsePresets();

  for (const preset of presets) {
    const theme: CoverTheme = {
      current: CURRENT_THEME,
      original: preset.theme,
    };

    for (const role of ['primary', 'secondary', 'accent', 'neutral'] as const) {
      assert.equal(
        resolveCoverPaint(preset.theme[role], theme),
        CURRENT_THEME[role],
        `${preset.id}: a função ${role} foi misturada com outra cor`,
      );
    }
  }
});

test('cores estáticas de contraste e preenchimentos técnicos não são recoloridos', () => {
  const theme: CoverTheme = { current: CURRENT_THEME };

  assert.equal(resolveCoverPaint('#FFFFFF', theme), null);
  assert.equal(resolveCoverPaint('#fff', theme), null);
  assert.equal(resolveCoverPaint('white', theme), null);
  assert.equal(resolveCoverPaint('none', theme), null);
  assert.equal(resolveCoverPaint('transparent', theme), null);
  assert.equal(resolveCoverPaint('url(#gradiente)', theme), null);
});
