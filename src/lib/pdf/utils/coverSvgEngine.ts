import { PdfTheme, TransformConfig } from '../../../types/pdfModels';

type CoverValues = {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverImageTransform?: TransformConfig;
  logoTransform?: TransformConfig;
};

type CoverTheme = {
  current: PdfTheme;
  original?: PdfTheme;
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

function mapPaint(value: string | null, theme: CoverTheme) {
  if (shouldSkipPaint(value)) return null;

  const normalized = normalizeHex(value);
  if (theme.original) {
    for (const key of Object.keys(theme.original) as Array<keyof PdfTheme>) {
      if (normalizeHex(theme.original[key]) === normalized) return theme.current[key];
    }
  }

  const alias = COLOR_ALIASES[normalized];
  return alias ? theme.current[alias] : null;
}

function applyPaintToElement(element: Element, theme: CoverTheme) {
  const fill = mapPaint(element.getAttribute('fill'), theme);
  if (fill) element.setAttribute('fill', fill);

  const stroke = mapPaint(element.getAttribute('stroke'), theme);
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

function applyTheme(doc: Document, theme: CoverTheme) {
  doc.querySelectorAll('[fill], [stroke]').forEach((element) => applyPaintToElement(element, theme));
  forceGroupPaint(doc, '[id*="cor_primaria"], [id*="Cor_primaria"], [id*="primary"]', theme.current.primary);
  forceGroupPaint(doc, '[id*="cor_secund"], [id*="Cor_secund"], [id*="secondary"]', theme.current.secondary);
}

function setHref(element: Element | null, href: string) {
  if (!element || !href) return;
  element.setAttribute('href', href);
  element.setAttribute('xlink:href', href);
}

function findPhotoPatternImage(doc: Document) {
  const photoGroup = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('foto') || id.includes('cover-photo');
  });

  const shapeWithPattern = photoGroup?.querySelector('[fill^="url(#"]') || doc.querySelector('[fill^="url(#pattern"]');
  const fill = shapeWithPattern?.getAttribute('fill') || '';
  const match = fill.match(/url\(#([^\)]+)\)/);
  const patternId = match?.[1];
  return patternId ? doc.querySelector(`#${CSS.escape(patternId)} image`) : doc.querySelector('pattern image');
}

function applyTransform(element: Element, transform?: TransformConfig) {
  if (!transform) return;
  const width = parseFloat(element.getAttribute('width') || '595');
  const height = parseFloat(element.getAttribute('height') || '842');
  const cx = width / 2;
  const cy = height / 2;
  element.setAttribute('transform', `translate(${transform.x}, ${transform.y}) translate(${cx}, ${cy}) scale(${transform.zoom}) rotate(${transform.rotate}) translate(${-cx}, ${-cy})`);
}

function hidePhotoIcon(doc: Document) {
  doc.querySelectorAll('[id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
  });
}

function replaceLogo(doc: Document, logoUrl?: string | null, transform?: TransformConfig) {
  if (!logoUrl) return;

  const logoText = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('logo');
  });

  if (!logoText) return;

  const image = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttribute('id', 'company-logo');
  image.setAttribute('href', logoUrl);
  image.setAttribute('xlink:href', logoUrl);
  image.setAttribute('x', '32');
  image.setAttribute('y', '32');
  image.setAttribute('width', '140');
  image.setAttribute('height', '64');
  image.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  if (transform) image.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.zoom}) rotate(${transform.rotate})`);

  logoText.setAttribute('display', 'none');
  logoText.parentNode?.appendChild(image);
}

function replaceTextContent(text: string, values: CoverValues) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (!clean) return text;
  if (/nome\s+(sobrenome|do cliente)|nome do cliente|nome sobrenome/i.test(clean)) return values.clientName || clean;
  if (/0[,.]00\s*kwp|4\.95\s*kwp/i.test(clean)) return values.powerKwp || clean;
  if (/cidade\s*-?\s*estado|cidade-estado|cidade estado/i.test(clean)) return values.cityState || clean;
  if (/dd\s*\/\s*mm\s*\/\s*aa/i.test(clean)) return values.date || clean;
  if (lower === 'cliente' || lower === 'data') return clean;

  return text;
}

function applyTexts(doc: Document, values: CoverValues) {
  doc.querySelectorAll('text, tspan').forEach((element) => {
    const current = element.textContent || '';
    const next = replaceTextContent(current, values);
    if (next !== current) element.textContent = next;
  });
}

export function buildCoverSvg(svgSource: string, theme: CoverTheme, values: CoverValues = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSource, 'image/svg+xml');

  applyTheme(doc, theme);
  applyTexts(doc, values);

  const photoImage = findPhotoPatternImage(doc);
  if (photoImage && values.coverImageUrl) {
    setHref(photoImage, values.coverImageUrl);
    photoImage.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    applyTransform(photoImage, values.coverImageTransform);
    hidePhotoIcon(doc);
  }

  replaceLogo(doc, values.logoUrl, values.logoTransform);

  return new XMLSerializer().serializeToString(doc);
}
