export type PlatformThemeMode = 'dark' | 'light';

export interface PlatformThemeSeed {
  mode: PlatformThemeMode;
  primary: string;
  accent: string;
  background: string;
  success: string;
  warning: string;
}

export interface PlatformThemePalette extends PlatformThemeSeed {
  primaryHover: string;
  text: string;
  mutedText: string;
  surface: string;
  border: string;
  cardAlt: string;
  inputBg: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray700: string;
  gray800: string;
  gray900: string;
  chartPositive: string;
  chartNegative: string;
  chartGrid: string;
  chartAxis: string;
  chartZero: string;
  chartCursor: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;
  chartTooltipText: string;
  chartTooltipMuted: string;
  chartPanel: string;
  chartMarker: string;
  chartMarkerBg: string;
}

export interface PlatformThemeConfig {
  seed: PlatformThemeSeed;
  palette: PlatformThemePalette;
  updated_at?: string;
}

export const DEFAULT_PLATFORM_THEME_SEED: PlatformThemeSeed = {
  mode: 'dark',
  primary: '#0076DD',
  accent: '#64B0F3',
  background: '#0E2337',
  success: '#B4BF8A',
  warning: '#FACB5C',
};

export const PLATFORM_THEME_PRESETS: Array<{ name: string; description: string; seed: PlatformThemeSeed }> = [
  {
    name: 'Sol Amigo Pro',
    description: 'Azul profundo com acento solar.',
    seed: DEFAULT_PLATFORM_THEME_SEED,
  },
  {
    name: 'Solar Premium',
    description: 'Dourado comercial com fundo escuro.',
    seed: {
      mode: 'dark',
      primary: '#F59E0B',
      accent: '#FDE68A',
      background: '#111827',
      success: '#22C55E',
      warning: '#FACC15',
    },
  },
  {
    name: 'Eco Verde',
    description: 'Verde técnico para energia limpa.',
    seed: {
      mode: 'dark',
      primary: '#16A34A',
      accent: '#86EFAC',
      background: '#0F2A1C',
      success: '#A3E635',
      warning: '#FBBF24',
    },
  },
  {
    name: 'Oceano Claro',
    description: 'Interface clara com azul confiável.',
    seed: {
      mode: 'light',
      primary: '#0076DD',
      accent: '#0EA5E9',
      background: '#F8FAFC',
      success: '#16A34A',
      warning: '#F59E0B',
    },
  },
];

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const normalizeHex = (value?: string | null, fallback = '#000000') => {
  if (!value) return fallback;
  const raw = value.trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((char) => char + char).join('').toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  return fallback;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return `#${[r, g, b].map((channel) => clamp(channel).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

const mix = (color: string, target: string, amount: number) => {
  const start = hexToRgb(color);
  const end = hexToRgb(target);
  return rgbToHex(
    start.r + (end.r - start.r) * amount,
    start.g + (end.g - start.g) * amount,
    start.b + (end.b - start.b) * amount,
  );
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const values = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
};

const getReadableText = (background: string) => luminance(background) > 0.45 ? '#0F172A' : '#F8FAFC';
const getMutedText = (background: string) => luminance(background) > 0.45 ? '#475569' : '#94A3B8';

export const buildPlatformTheme = (seed: Partial<PlatformThemeSeed> = {}): PlatformThemeConfig => {
  const normalizedSeed: PlatformThemeSeed = {
    mode: seed.mode || DEFAULT_PLATFORM_THEME_SEED.mode,
    primary: normalizeHex(seed.primary, DEFAULT_PLATFORM_THEME_SEED.primary),
    accent: normalizeHex(seed.accent, DEFAULT_PLATFORM_THEME_SEED.accent),
    background: normalizeHex(seed.background, DEFAULT_PLATFORM_THEME_SEED.background),
    success: normalizeHex(seed.success, DEFAULT_PLATFORM_THEME_SEED.success),
    warning: normalizeHex(seed.warning, DEFAULT_PLATFORM_THEME_SEED.warning),
  };

  const isLight = normalizedSeed.mode === 'light';
  const palette: PlatformThemePalette = {
    ...normalizedSeed,
    primaryHover: mix(normalizedSeed.primary, '#000000', isLight ? 0.16 : 0.22),
    text: getReadableText(normalizedSeed.background),
    mutedText: getMutedText(normalizedSeed.background),
    surface: mix(normalizedSeed.background, isLight ? '#FFFFFF' : '#FFFFFF', isLight ? 0.72 : 0.08),
    border: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.34 : 0.22),
    cardAlt: mix(normalizedSeed.background, isLight ? '#E2E8F0' : '#FFFFFF', isLight ? 0.82 : 0.13),
    inputBg: mix(normalizedSeed.background, isLight ? '#FFFFFF' : '#000000', isLight ? 0.88 : 0.16),
    gray100: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.12 : 0.18),
    gray200: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.22 : 0.32),
    gray300: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.34 : 0.44),
    gray700: isLight ? '#334155' : '#E2E8F0',
    gray800: isLight ? '#1E293B' : '#F1F5F9',
    gray900: isLight ? '#0F172A' : '#F8FAFC',
    chartPositive: normalizedSeed.primary,
    chartNegative: isLight ? '#DC2626' : '#F87171',
    chartGrid: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.2 : 0.28),
    chartAxis: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.5 : 0.62),
    chartZero: mix(normalizedSeed.background, getReadableText(normalizedSeed.background), isLight ? 0.42 : 0.5),
    chartCursor: mix(normalizedSeed.background, normalizedSeed.primary, isLight ? 0.1 : 0.18),
    chartTooltipBg: mix(normalizedSeed.background, isLight ? '#FFFFFF' : '#000000', isLight ? 0.9 : 0.2),
    chartTooltipBorder: mix(normalizedSeed.background, normalizedSeed.primary, isLight ? 0.34 : 0.44),
    chartTooltipText: getReadableText(normalizedSeed.background),
    chartTooltipMuted: getMutedText(normalizedSeed.background),
    chartPanel: mix(normalizedSeed.background, normalizedSeed.primary, isLight ? 0.06 : 0.1),
    chartMarker: normalizedSeed.accent,
    chartMarkerBg: mix(normalizedSeed.background, normalizedSeed.accent, isLight ? 0.12 : 0.2),
  };

  return {
    seed: normalizedSeed,
    palette,
    updated_at: new Date().toISOString(),
  };
};

const setCssVar = (name: string, value: string) => {
  document.documentElement.style.setProperty(name, value);
};

export const applyPlatformTheme = (theme?: PlatformThemeConfig | null) => {
  const activeTheme = buildPlatformTheme(theme?.seed || DEFAULT_PLATFORM_THEME_SEED);
  const palette = activeTheme.palette;

  setCssVar('--color-brand-blue', palette.primary);
  setCssVar('--color-brand-primary', palette.primary);
  setCssVar('--color-brand-blue-hover', palette.primaryHover);
  setCssVar('--color-brand-primary-hover', palette.primaryHover);
  setCssVar('--color-brand-light', palette.accent);
  setCssVar('--color-brand-yellow', palette.warning);
  setCssVar('--color-brand-green', palette.success);
  setCssVar('--color-brand-gray', palette.background);
  setCssVar('--color-brand-surface', palette.surface);
  setCssVar('--color-brand-border', palette.border);
  setCssVar('--color-brand-dark', palette.text);
  setCssVar('--color-slate-500', palette.mutedText);
  setCssVar('--color-gray-50', palette.cardAlt);
  setCssVar('--color-gray-100', palette.gray100);
  setCssVar('--color-gray-200', palette.gray200);
  setCssVar('--color-gray-300', palette.gray300);
  setCssVar('--color-gray-700', palette.gray700);
  setCssVar('--color-gray-800', palette.gray800);
  setCssVar('--color-gray-900', palette.gray900);
  setCssVar('--color-chart-positive', palette.chartPositive);
  setCssVar('--color-chart-negative', palette.chartNegative);
  setCssVar('--color-chart-grid', palette.chartGrid);
  setCssVar('--color-chart-axis', palette.chartAxis);
  setCssVar('--color-chart-zero', palette.chartZero);
  setCssVar('--color-chart-cursor', palette.chartCursor);
  setCssVar('--color-chart-tooltip-bg', palette.chartTooltipBg);
  setCssVar('--color-chart-tooltip-border', palette.chartTooltipBorder);
  setCssVar('--color-chart-tooltip-text', palette.chartTooltipText);
  setCssVar('--color-chart-tooltip-muted', palette.chartTooltipMuted);
  setCssVar('--color-chart-panel', palette.chartPanel);
  setCssVar('--color-chart-marker', palette.chartMarker);
  setCssVar('--color-chart-marker-bg', palette.chartMarkerBg);

  document.documentElement.dataset.platformThemeMode = palette.mode;
};

export const resetPlatformTheme = () => {
  const defaults = buildPlatformTheme(DEFAULT_PLATFORM_THEME_SEED);
  applyPlatformTheme(defaults);
  return defaults;
};