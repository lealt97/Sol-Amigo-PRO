import { PdfTheme } from '../types/pdfDesignTypes';

export type CoverTheme = {
  current: PdfTheme;
  original?: PdfTheme;
};

export type CoverPaintContext = {
  isCover12: boolean;
};

const COLOR_ALIASES: Record<string, keyof PdfTheme> = {
  '#0A2249': 'primary',
  '#051225': 'primary',
  '#0051F0': 'primary',
  '#0051EF': 'primary',
  '#0151EF': 'primary',
  '#39B66A': 'primary',
  '#15AE51': 'primary',
  '#16AF52': 'primary',
  '#C49133': 'secondary',
  '#AFB77D': 'secondary',
  '#FFCC00': 'secondary',
  '#DEC488': 'secondary',
  '#FACB5C': 'accent',
  '#FFD600': 'accent',
  '#64B0F3': 'accent',
  '#1F2A2A': 'neutral',
  '#1E1E1E': 'neutral',
  '#3A3A3C': 'neutral',
  '#183956': 'neutral',
  '#D9D9D9': 'neutral',
};

function normalizeHex(value: string | null) {
  if (!value) return '';
  const color = value.trim();
  const upper = color.toUpperCase();
  if (upper === 'BLACK') return '#000000';
  if (upper === 'WHITE') return '#FFFFFF';
  if (!color.startsWith('#')) return color;
  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
  }
  return color.toUpperCase();
}

function shouldSkipPaint(value: string | null) {
  if (!value) return true;
  const paint = value.trim();
  return paint === 'none' || paint === 'transparent' || paint.startsWith('url(') || normalizeHex(paint) === '#FFFFFF';
}

function getPaintContext(doc: Document): CoverPaintContext {
  return {
    isCover12: Boolean(
      doc.getElementById('capa_12')
      || doc.getElementById('A4 - 12'),
    ),
  };
}

/**
 * Resolves a paint color while respecting cover-specific design rules.
 *
 * Cover 12 intentionally keeps #D9D9D9 as a fixed structural gray. Its black
 * elements belong to the neutral theme role. These rules are evaluated before
 * the preset's original palette so the fixed gray can never be recolored by a
 * neutral value inherited from an older preset definition.
 */
export function resolveCoverPaint(
  value: string | null,
  theme: CoverTheme,
  context: CoverPaintContext = { isCover12: false },
) {
  if (shouldSkipPaint(value)) return null;
  const normalized = normalizeHex(value);

  if (context.isCover12) {
    if (normalized === '#D9D9D9') return null;
    if (normalized === '#000000') return theme.current.neutral;
  }

  if (theme.original) {
    for (const key of Object.keys(theme.original) as Array<keyof PdfTheme>) {
      if (normalizeHex(theme.original[key]) === normalized) return theme.current[key];
    }
  }
  const alias = COLOR_ALIASES[normalized];
  return alias ? theme.current[alias] : null;
}

function applyPaintToElement(
  element: Element,
  theme: CoverTheme,
  context: CoverPaintContext,
) {
  const fill = resolveCoverPaint(element.getAttribute('fill'), theme, context);
  if (fill) element.setAttribute('fill', fill);
  const stroke = resolveCoverPaint(element.getAttribute('stroke'), theme, context);
  if (stroke) element.setAttribute('stroke', stroke);
}

function forceGroupPaint(doc: Document, selector: string, color: string) {
  doc.querySelectorAll(selector).forEach((group) => {
    group.querySelectorAll('[fill], [stroke]').forEach((element) => {
      const fill = element.getAttribute('fill');
      const stroke = element.getAttribute('stroke');
      if (fill && !shouldSkipPaint(fill)) element.setAttribute('fill', color);
      if (stroke && !shouldSkipPaint(stroke)) element.setAttribute('stroke', color);
    });
  });
}

export function applyTheme(doc: Document, theme: CoverTheme) {
  const context = getPaintContext(doc);
  doc.querySelectorAll('[fill], [stroke]').forEach((element) => {
    applyPaintToElement(element, theme, context);
  });
  forceGroupPaint(doc, '[id*="cor_primaria"], [id*="Cor_primaria"], [id*="primary"]', theme.current.primary);
  forceGroupPaint(doc, '[id*="cor_secund"], [id*="Cor_secund"], [id*="secondary"]', theme.current.secondary);
}
