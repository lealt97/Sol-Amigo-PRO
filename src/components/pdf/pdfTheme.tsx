import React, { createContext, useContext } from 'react';
import { PdfTheme } from '../../types/pdfModels';

export interface PdfDocumentTheme {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
  primarySoft: string;
  secondarySoft: string;
  accentSoft: string;
  neutralSoft: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
}

const FALLBACK_THEME: PdfTheme = {
  primary: '#0A2249',
  secondary: '#C49133',
  accent: '#FACB5C',
  neutral: '#1F2A2A',
};

function normalizeHex(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;

  if (/^#[0-9a-f]{6}$/i.test(candidate)) return candidate.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return `#${candidate
      .slice(1)
      .split('')
      .map((character) => `${character}${character}`)
      .join('')}`.toUpperCase();
  }

  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, '#000000').slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function mixPdfColor(color: string, target = '#FFFFFF', targetWeight = 0.5) {
  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);
  const weight = Math.max(0, Math.min(1, targetWeight));

  return rgbToHex(
    sourceRgb.r * (1 - weight) + targetRgb.r * weight,
    sourceRgb.g * (1 - weight) + targetRgb.g * weight,
    sourceRgb.b * (1 - weight) + targetRgb.b * weight,
  );
}

export function getPdfContrastColor(background: string) {
  const { r, g, b } = hexToRgb(background);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? '#102033' : '#FFFFFF';
}

export function resolvePdfDocumentTheme(theme?: Partial<PdfTheme> | null): PdfDocumentTheme {
  const primary = normalizeHex(theme?.primary, FALLBACK_THEME.primary);
  const secondary = normalizeHex(theme?.secondary, FALLBACK_THEME.secondary);
  const accent = normalizeHex(theme?.accent, FALLBACK_THEME.accent);
  const neutral = normalizeHex(theme?.neutral, FALLBACK_THEME.neutral);
  const neutralIsLight = getPdfContrastColor(neutral) === '#102033';
  const text = neutralIsLight ? '#263442' : neutral;

  return {
    primary,
    secondary,
    accent,
    neutral,
    text,
    muted: mixPdfColor(text, '#FFFFFF', 0.46),
    surface: mixPdfColor(primary, '#FFFFFF', 0.965),
    border: mixPdfColor(neutral, '#FFFFFF', neutralIsLight ? 0.45 : 0.82),
    primarySoft: mixPdfColor(primary, '#FFFFFF', 0.88),
    secondarySoft: mixPdfColor(secondary, '#FFFFFF', 0.86),
    accentSoft: mixPdfColor(accent, '#FFFFFF', 0.78),
    neutralSoft: mixPdfColor(neutral, '#FFFFFF', 0.9),
    onPrimary: getPdfContrastColor(primary),
    onSecondary: getPdfContrastColor(secondary),
    onAccent: getPdfContrastColor(accent),
  };
}

const DEFAULT_THEME = resolvePdfDocumentTheme(FALLBACK_THEME);
const PdfThemeContext = createContext<PdfDocumentTheme>(DEFAULT_THEME);

export const PdfThemeProvider = ({
  theme,
  children,
}: {
  theme?: Partial<PdfTheme> | null;
  children: React.ReactNode;
}) => {
  return (
    <PdfThemeContext.Provider value={resolvePdfDocumentTheme(theme)}>
      {children}
    </PdfThemeContext.Provider>
  );
};

export function usePdfTheme() {
  return useContext(PdfThemeContext);
}

export function getSectionTitleStyle(theme: PdfDocumentTheme) {
  return {
    color: theme.neutral,
    borderBottomColor: theme.primary,
  };
}

export function getPrimaryAccentStyle(theme: PdfDocumentTheme) {
  return {
    borderLeftColor: theme.primary,
    color: theme.primary,
  };
}
