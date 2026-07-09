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

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const COLOR_ALIASES: Record<string, keyof PdfTheme> = {
  '#0A2249': 'primary',
  '#051225': 'primary',
  '#0051F0': 'primary',
  '#0051EF': 'primary',
  '#0151EF': 'primary',
  '#39B66A': 'primary',
  '#15AE51': 'primary',
  '#16AF52': 'primary',
  '#1AA6BE': 'primary',
  '#C49133': 'secondary',
  '#AFB77D': 'secondary',
  '#FFCC00': 'secondary',
  '#DEC488': 'secondary',
  '#DD400B': 'secondary',
  '#FACB5C': 'accent',
  '#FFD600': 'accent',
  '#64B0F3': 'accent',
  '#D4D5D7': 'accent',
  '#1F2A2A': 'neutral',
  '#1E1E1E': 'neutral',
  '#3A3A3C': 'neutral',
  '#183956': 'neutral',
  '#D9D9D9': 'neutral',
  '#524848': 'neutral',
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
  doc.querySelectorAll('[fill], [stroke]').forEach((element) => {
    const fill = mapPaint(element.getAttribute('fill'), theme);
    const stroke = mapPaint(element.getAttribute('stroke'), theme);
    if (fill) element.setAttribute('fill', fill);
    if (stroke) element.setAttribute('stroke', stroke);
  });

  forceGroupPaint(doc, '[id*="cor_primaria"], [id*="Cor_primaria"], [id*="primary"]', theme.current.primary);
  forceGroupPaint(doc, '[id*="cor_secund"], [id*="Cor_secund"], [id*="secondary"]', theme.current.secondary);
  forceGroupPaint(doc, '[id*="cor_destaque"], [id*="Cor_destaque"], [id*="accent"]', theme.current.accent);
  forceGroupPaint(doc, '[id*="cor_neutra"], [id*="Cor_neutra"], [id*="neutral"]', theme.current.neutral);
}

function setHref(element: Element, href: string) {
  element.setAttribute('href', href);
  element.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

function getUrlReference(value: string | null) {
  const match = value?.match(/url\(#([^\)]+)\)/);
  return match?.[1] || null;
}

function parseBounds(value: string | null): Bounds | null {
  if (!value) return null;
  const [x, y, width, height] = value.trim().split(/[\s,]+/).map(Number);
  if ([x, y, width, height].some(Number.isNaN)) return null;
  return { x, y, width, height };
}

function getImageTransform(bounds: Bounds, transform?: TransformConfig) {
  const zoom = Math.max(0.1, Number(transform?.zoom ?? 1));
  const offsetX = Number(transform?.x ?? 0);
  const offsetY = Number(transform?.y ?? 0);
  const rotate = Number(transform?.rotate ?? 0);
  const width = bounds.width * zoom;
  const height = bounds.height * zoom;
  const x = bounds.x + (bounds.width - width) / 2 + offsetX;
  const y = bounds.y + (bounds.height - height) / 2 + offsetY;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x,
    y,
    width,
    height,
    transform: rotate ? `rotate(${rotate} ${centerX} ${centerY})` : '',
  };
}

function clearElement(element: Element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function hidePhotoPlaceholder(doc: Document) {
  doc.querySelectorAll('[id*="foto_aqui_placeholder"], [id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"], [id*="photo_icon"], [id*="image_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
  });
}

function applyPhotoAsClipLayer(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return false;

  const layer = doc.getElementById('cover-photo-layer');
  if (!layer) return false;

  const coverGroup = doc.getElementById('cover-photo') || layer.parentElement;
  const bounds = parseBounds(coverGroup?.getAttribute('data-photo-bounds') || null) || { x: 0, y: 0, width: 595, height: 842 };
  const crop = getImageTransform(bounds, transform);

  clearElement(layer);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'clip-layer');
  image.setAttribute('x', String(crop.x));
  image.setAttribute('y', String(crop.y));
  image.setAttribute('width', String(crop.width));
  image.setAttribute('height', String(crop.height));
  image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  if (crop.transform) image.setAttribute('transform', crop.transform);
  setHref(image, imageUrl);

  layer.appendChild(image);
  hidePhotoPlaceholder(doc);
  return true;
}

function findLegacyPhotoShape(doc: Document) {
  const byId = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('foto_aqui') || id.includes('foto aqui') || id.includes('cover-photo');
  });

  const shape = byId?.matches('path, rect, polygon, polyline, circle, ellipse')
    ? byId
    : byId?.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');

  return shape || doc.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');
}

function applyPhotoAsPattern(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return;

  const shape = findLegacyPhotoShape(doc);
  const patternId = getUrlReference(shape?.getAttribute('fill') || null);
  const pattern = patternId ? doc.getElementById(patternId) : null;
  if (!shape || !pattern) return;

  clearElement(pattern);
  pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
  pattern.setAttribute('width', '1');
  pattern.setAttribute('height', '1');
  pattern.removeAttribute('patternTransform');

  const zoom = Math.max(0.1, Number(transform?.zoom ?? 1));
  const left = (1 - zoom) / 2 + Number(transform?.x ?? 0) / 595;
  const top = (1 - zoom) / 2 + Number(transform?.y ?? 0) / 842;
  const rotate = Number(transform?.rotate ?? 0);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'crop');
  image.setAttribute('x', String(left));
  image.setAttribute('y', String(top));
  image.setAttribute('width', String(zoom));
  image.setAttribute('height', String(zoom));
  image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  if (rotate) image.setAttribute('transform', `rotate(${rotate} 0.5 0.5)`);
  setHref(image, imageUrl);

  pattern.appendChild(image);
  shape.setAttribute('id', 'cover-photo-shape');
  shape.setAttribute('data-pdf-role', 'cover-photo-shape');
  hidePhotoPlaceholder(doc);
}

function replaceLogo(doc: Document, logoUrl?: string | null, transform?: TransformConfig) {
  if (!logoUrl) return;

  const logoElement = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('logo');
  });

  if (!logoElement) return;

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'company-logo-image');
  setHref(image, logoUrl);
  image.setAttribute('x', '32');
  image.setAttribute('y', '32');
  image.setAttribute('width', '140');
  image.setAttribute('height', '64');
  image.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  if (transform) image.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.zoom}) rotate(${transform.rotate})`);

  logoElement.setAttribute('display', 'none');
  logoElement.parentNode?.appendChild(image);
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
  const photoApplied = applyPhotoAsClipLayer(doc, values.coverImageUrl, values.coverImageTransform);
  if (!photoApplied) applyPhotoAsPattern(doc, values.coverImageUrl, values.coverImageTransform);
  replaceLogo(doc, values.logoUrl, values.logoTransform);

  return new XMLSerializer().serializeToString(doc);
}
