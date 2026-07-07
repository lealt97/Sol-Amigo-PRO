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

const SVG_NS = 'http://www.w3.org/2000/svg';

const COLOR_ALIASES: Record<string, keyof PdfTheme> = {
  '#0A2249': 'primary',
  '#051225': 'primary',
  '#0051F0': 'primary',
  '#0051EF': 'primary',
  '#0151EF': 'primary',
  '#0076DD': 'primary',
  '#39B66A': 'primary',
  '#15AE51': 'primary',
  '#16AF52': 'primary',
  '#C49133': 'secondary',
  '#AFB77D': 'secondary',
  '#DEC488': 'secondary',
  '#B4BF8A': 'secondary',
  '#FFCC00': 'accent',
  '#FACB5C': 'accent',
  '#FFD600': 'accent',
  '#64B0F3': 'accent',
  '#1F2A2A': 'neutral',
  '#1E1E1E': 'neutral',
  '#3A3A3C': 'neutral',
  '#0E2337': 'neutral',
  '#183956': 'neutral',
  '#D9D9D9': 'neutral',
};

const PLACEHOLDER_IDS = {
  clientName: 'client-name',
  projectPower: 'project-power',
  cityState: 'city-state',
  proposalDate: 'proposal-date',
  coverPhoto: 'cover-photo',
  coverPhotoShape: 'cover-photo-shape',
  coverPhotoImage: 'cover-photo-image',
  companyLogo: 'company-logo',
  companyLogoPlaceholder: 'company-logo-placeholder',
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
      if (normalizeHex(theme.original[key]) === normalized) return { role: key, color: theme.current[key] };
    }
  }

  const role = COLOR_ALIASES[normalized];
  return role ? { role, color: theme.current[role] } : null;
}

function setColorRole(element: Element, role: keyof PdfTheme) {
  element.setAttribute('data-pdf-color-role', role);
  element.setAttribute('class', `${element.getAttribute('class') || ''} pdf-color-${role}`.trim());
}

function applyStylePaints(element: Element, theme: CoverTheme) {
  const style = element.getAttribute('style');
  if (!style) return;

  let nextStyle = style;
  const fillMatch = style.match(/fill:\s*(#[0-9a-fA-F]{3,8})/);
  const strokeMatch = style.match(/stroke:\s*(#[0-9a-fA-F]{3,8})/);

  if (fillMatch) {
    const mapped = mapPaint(fillMatch[1], theme);
    if (mapped) {
      nextStyle = nextStyle.replace(fillMatch[0], `fill:${mapped.color}`);
      setColorRole(element, mapped.role);
    }
  }

  if (strokeMatch) {
    const mapped = mapPaint(strokeMatch[1], theme);
    if (mapped) {
      nextStyle = nextStyle.replace(strokeMatch[0], `stroke:${mapped.color}`);
      setColorRole(element, mapped.role);
    }
  }

  element.setAttribute('style', nextStyle);
}

function applyPaintToElement(element: Element, theme: CoverTheme) {
  const fill = mapPaint(element.getAttribute('fill'), theme);
  if (fill) {
    element.setAttribute('fill', fill.color);
    setColorRole(element, fill.role);
  }

  const stroke = mapPaint(element.getAttribute('stroke'), theme);
  if (stroke) {
    element.setAttribute('stroke', stroke.color);
    setColorRole(element, stroke.role);
  }

  applyStylePaints(element, theme);
}

function forceGroupPaint(doc: Document, selector: string, role: keyof PdfTheme, color: string) {
  doc.querySelectorAll(selector).forEach((group) => {
    group.setAttribute('data-pdf-color-role', role);
    group.querySelectorAll('[fill], [stroke], [style]').forEach((element) => {
      const fill = element.getAttribute('fill');
      const stroke = element.getAttribute('stroke');
      if (fill && !shouldSkipPaint(fill)) element.setAttribute('fill', color);
      if (stroke && !shouldSkipPaint(stroke)) element.setAttribute('stroke', color);
      setColorRole(element, role);
    });
  });
}

function applyTheme(doc: Document, theme: CoverTheme) {
  doc.querySelectorAll('[fill], [stroke], [style]').forEach((element) => applyPaintToElement(element, theme));
  forceGroupPaint(doc, '[id*="cor_primaria"], [id*="Cor_primaria"], [id*="primary"]', 'primary', theme.current.primary);
  forceGroupPaint(doc, '[id*="cor_secund"], [id*="Cor_secund"], [id*="secondary"]', 'secondary', theme.current.secondary);
  forceGroupPaint(doc, '[id*="cor_destaque"], [id*="Cor_destaque"], [id*="accent"]', 'accent', theme.current.accent);
}

function setHref(element: Element | null, href: string) {
  if (!element || !href) return;
  element.setAttribute('href', href);
  element.setAttribute('xlink:href', href);
}

function safeSetId(element: Element | null, id: string) {
  if (!element) return;
  element.setAttribute('id', id);
  element.setAttribute('data-pdf-id', id);
}

function getPatternImageFromFill(doc: Document, fill: string | null) {
  const match = fill?.match(/url\(#([^\)]+)\)/);
  const patternId = match?.[1];
  if (!patternId) return null;
  return doc.getElementById(patternId)?.querySelector('image') || null;
}

function findPhotoNodes(doc: Document) {
  const explicitImage = doc.getElementById(PLACEHOLDER_IDS.coverPhotoImage);
  if (explicitImage) return { image: explicitImage, shape: explicitImage.parentElement, group: explicitImage.parentElement };

  const photoGroup = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('foto') || id.includes('cover-photo') || id.includes('photo');
  });

  const shapeWithPattern = photoGroup?.querySelector('[fill^="url(#"]') || doc.querySelector('[fill^="url(#pattern"]') || doc.querySelector('[fill^="url(#"]');
  const image = getPatternImageFromFill(doc, shapeWithPattern?.getAttribute('fill') || null) || doc.querySelector('pattern image') || doc.querySelector('image');

  return {
    image,
    shape: shapeWithPattern,
    group: photoGroup || shapeWithPattern?.parentElement || image?.parentElement || null,
  };
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
  doc.querySelectorAll('[id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"], [id*="photo_icon"], [id*="image_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
  });
}

function getTextContent(element: Element) {
  return (element.textContent || '').replace(/\s+/g, ' ').trim();
}

function findLogoPlaceholder(doc: Document) {
  const logoById = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('logo') && id !== PLACEHOLDER_IDS.companyLogo;
  });

  if (logoById) return logoById;

  return Array.from(doc.querySelectorAll('text, tspan')).find((element) => /logo/i.test(getTextContent(element))) || null;
}

function getBBoxFromAttributes(element: Element | null) {
  if (!element) return null;
  const x = parseFloat(element.getAttribute('x') || '32');
  const y = parseFloat(element.getAttribute('y') || '32');
  const width = parseFloat(element.getAttribute('width') || '140');
  const height = parseFloat(element.getAttribute('height') || '64');
  return { x, y, width, height };
}

function replaceLogo(doc: Document, logoUrl?: string | null, transform?: TransformConfig) {
  const logoPlaceholder = findLogoPlaceholder(doc);
  if (logoPlaceholder) safeSetId(logoPlaceholder, PLACEHOLDER_IDS.companyLogoPlaceholder);

  if (!logoUrl) return;

  const box = getBBoxFromAttributes(logoPlaceholder);
  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', PLACEHOLDER_IDS.companyLogo);
  image.setAttribute('data-pdf-role', 'company-logo');
  image.setAttribute('href', logoUrl);
  image.setAttribute('xlink:href', logoUrl);
  image.setAttribute('x', String(box?.x ?? 32));
  image.setAttribute('y', String(box?.y ?? 32));
  image.setAttribute('width', String(box?.width || 140));
  image.setAttribute('height', String(box?.height || 64));
  image.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  if (transform) image.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.zoom}) rotate(${transform.rotate})`);

  if (logoPlaceholder) {
    logoPlaceholder.setAttribute('display', 'none');
    logoPlaceholder.parentNode?.appendChild(image);
  } else {
    doc.querySelector('svg')?.appendChild(image);
  }
}

function classifyText(text: string): keyof Pick<CoverValues, 'clientName' | 'powerKwp' | 'cityState' | 'date'> | null {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (!clean) return null;
  if (/nome\s+(sobrenome|do cliente)|nome do cliente|nome sobrenome|cliente exemplo/i.test(clean)) return 'clientName';
  if (/0[,.]00\s*kwp|4\.95\s*kwp|kwp|pot[eê]ncia/i.test(clean)) return 'powerKwp';
  if (/cidade\s*-?\s*estado|cidade-estado|cidade estado|s[aã]o paulo\s*-\s*sp/i.test(clean)) return 'cityState';
  if (/dd\s*\/\s*mm\s*\/\s*aa|\d{2}\/\d{2}\/\d{4}|data/i.test(clean)) {
    if (lower === 'data') return null;
    return 'date';
  }

  return null;
}

function replaceTextContent(text: string, values: CoverValues) {
  const kind = classifyText(text);
  if (!kind) return text;
  return values[kind] || text;
}

function applyTexts(doc: Document, values: CoverValues) {
  doc.querySelectorAll('text, tspan').forEach((element) => {
    const current = element.textContent || '';
    const kind = classifyText(current);
    if (!kind) return;

    const id = kind === 'clientName'
      ? PLACEHOLDER_IDS.clientName
      : kind === 'powerKwp'
      ? PLACEHOLDER_IDS.projectPower
      : kind === 'cityState'
      ? PLACEHOLDER_IDS.cityState
      : PLACEHOLDER_IDS.proposalDate;

    safeSetId(element, id);
    element.setAttribute('data-pdf-role', kind);

    const next = replaceTextContent(current, values);
    if (next !== current) element.textContent = next;
  });
}

function normalizePhoto(doc: Document, values: CoverValues) {
  const { image, shape, group } = findPhotoNodes(doc);
  safeSetId(group || shape || image, PLACEHOLDER_IDS.coverPhoto);
  safeSetId(shape, PLACEHOLDER_IDS.coverPhotoShape);
  safeSetId(image, PLACEHOLDER_IDS.coverPhotoImage);

  if (image) {
    image.setAttribute('data-pdf-role', 'cover-photo-image');
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  }

  if (image && values.coverImageUrl) {
    setHref(image, values.coverImageUrl);
    applyTransform(image, values.coverImageTransform);
    hidePhotoIcon(doc);
  }
}

export function buildCoverSvg(svgSource: string, theme: CoverTheme, values: CoverValues = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSource, 'image/svg+xml');

  normalizePhoto(doc, values);
  applyTheme(doc, theme);
  applyTexts(doc, values);
  replaceLogo(doc, values.logoUrl, values.logoTransform);

  return new XMLSerializer().serializeToString(doc);
}
