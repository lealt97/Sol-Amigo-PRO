import { PdfTheme } from '../types/pdfDesignTypes';

export type CoverTextValues = {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  validityText?: string;
};

type CoverField = keyof CoverTextValues;

type BoundElement = {
  element: Element;
  field: CoverField;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

const FIELD_ALIASES: Record<CoverField, string[]> = {
  clientName: [
    'slot clientname',
    'slot client name',
    'clientname',
    'client name',
    'client name value',
    'nome sobrenome',
    'nome do cliente',
    'nome cliente',
    'cliente valor',
  ],
  powerKwp: [
    'slot systempower',
    'slot system power',
    'slot projectpower',
    'slot project power',
    'systempower',
    'system power',
    'projectpower',
    'project power',
    'power kwp',
    'potencia valor',
    'potencia do sistema valor',
    'potencia nominal valor',
    'valor kwp',
    '0 00 kwp',
    '0 0 kwp',
    '4 95 kwp',
  ],
  cityState: [
    'slot citystate',
    'slot city state',
    'citystate',
    'city state',
    'cidade estado',
    'cidade uf',
    'localizacao valor',
  ],
  date: [
    'slot proposaldate',
    'slot proposal date',
    'proposaldate',
    'proposal date',
    'date value',
    'data valor',
    'data emissao valor',
    'dd mm aa',
    'dd mm aaaa',
  ],
  validityText: [
    'slot validity',
    'validity',
    'proposal validity',
    'validade valor',
    'validade dias',
    'validade 7 dias',
    'validade 7 d ias',
  ],
};

function normalizeToken(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bk\s+wp\b/g, 'kwp')
    .replace(/\bd\s+ias\b/g, 'dias')
    .trim();
}

function valueForField(values: CoverTextValues, field: CoverField) {
  const value = values[field];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function fieldFromBinding(binding: string | null | undefined): CoverField | null {
  const normalized = normalizeToken(binding);
  if (!normalized) return null;

  for (const field of Object.keys(FIELD_ALIASES) as CoverField[]) {
    const matches = FIELD_ALIASES[field].some((alias) => normalizeToken(alias) === normalized);
    if (matches) return field;
  }

  return null;
}

function fieldFromVisibleText(text: string): CoverField | null {
  const clean = text.trim();
  if (!clean) return null;

  if (/nome\s+(sobrenome|do cliente)|nome do cliente|nome sobrenome/i.test(clean)) {
    return 'clientName';
  }

  if (/^(0+[,.]0+|4[,.]95)\s*k\s*w\s*p$/i.test(clean)) {
    return 'powerKwp';
  }

  if (/^(cidade\s*[-/]?\s*estado|cidade\s*[-/]?\s*uf|cidade estado)$/i.test(clean)) {
    return 'cityState';
  }

  if (/^dd\s*[/.-]\s*mm\s*[/.-]\s*(aa|aaaa)$/i.test(clean)) {
    return 'date';
  }

  if (/^validade\s*:?\s*(\d+|x+)\s*d\s*ias?$/i.test(clean)) {
    return 'validityText';
  }

  return null;
}

function explicitFieldForElement(element: Element) {
  return fieldFromBinding(element.getAttribute('data-bind'))
    || fieldFromBinding(element.getAttribute('id'));
}

function collectBoundElements(doc: Document): BoundElement[] {
  const result: BoundElement[] = [];
  const visited = new Set<Element>();

  doc.querySelectorAll('[data-bind], [id], text, tspan').forEach((element) => {
    if (visited.has(element)) return;
    visited.add(element);

    const explicitField = explicitFieldForElement(element);
    const textField = element.matches('text, tspan')
      ? fieldFromVisibleText(element.textContent || '')
      : null;
    const field = explicitField || textField;

    if (field) result.push({ element, field });
  });

  return result;
}

function isVectorTextLeaf(element: Element) {
  const tagName = element.tagName.toLowerCase();
  const supportedLeaf = tagName === 'path' || tagName === 'polygon' || tagName === 'polyline';
  return supportedLeaf && element.children.length === 0 && Boolean(explicitFieldForElement(element));
}

function isDynamicSlot(element: Element) {
  if (element.tagName.toLowerCase() !== 'rect') return false;
  if (!explicitFieldForElement(element)) return false;

  const binding = normalizeToken(
    element.getAttribute('data-bind') || element.getAttribute('id'),
  );
  const parentSlotGroup = element.closest(
    '#dynamic_slots, [id="dynamic_slots"], [id*="dynamic_slots"], [data-dynamic-slots]',
  );

  return binding.startsWith('slot ') || Boolean(parentSlotGroup);
}

function resolveFill(element: Element, theme?: PdfTheme) {
  const configuredFill = element.getAttribute('data-text-fill')
    || element.getAttribute('data-text-color');
  if (configuredFill) return configuredFill;

  const directFill = element.getAttribute('fill');
  if (
    directFill
    && directFill !== 'none'
    && directFill !== 'transparent'
    && !directFill.startsWith('url(')
  ) {
    return directFill;
  }

  const childWithFill = element.querySelector('[fill]:not([fill="none"])');
  const childFill = childWithFill?.getAttribute('fill');
  if (childFill && childFill !== 'transparent' && !childFill.startsWith('url(')) {
    return childFill;
  }

  let parent = element.parentElement;
  while (parent) {
    const parentFill = parent.getAttribute('data-text-fill') || parent.getAttribute('fill');
    if (
      parentFill
      && parentFill !== 'none'
      && parentFill !== 'transparent'
      && !parentFill.startsWith('url(')
    ) {
      return parentFill;
    }
    parent = parent.parentElement;
  }

  return theme?.neutral || '#1E1E1E';
}

function fontWeightForField(field: CoverField) {
  return field === 'clientName' || field === 'powerKwp' ? '700' : '500';
}

function maxFontSizeForField(field: CoverField) {
  if (field === 'powerKwp') return 24;
  if (field === 'clientName') return 18;
  if (field === 'cityState') return 15;
  if (field === 'date') return 14;
  return 11;
}

function calculateFontSize(field: CoverField, value: string, width: number, height: number) {
  const widthFactor = field === 'powerKwp' ? 0.62 : 0.56;
  const widthBased = width / Math.max(value.length * widthFactor, 1);
  const heightBased = height * (field === 'validityText' ? 0.72 : 0.86);
  return Math.max(7, Math.min(widthBased, heightBased, maxFontSizeForField(field)));
}

function transformPoint(matrix: DOMMatrix, x: number, y: number) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function boundsFromRenderedElement(element: SVGGraphicsElement): Bounds | null {
  if (typeof element.getBBox !== 'function') return null;

  try {
    const box = element.getBBox();
    if (box.width <= 0 || box.height <= 0) return null;

    const matrix = typeof element.getCTM === 'function' ? element.getCTM() : null;
    if (!matrix) {
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }

    const points = [
      transformPoint(matrix, box.x, box.y),
      transformPoint(matrix, box.x + box.width, box.y),
      transformPoint(matrix, box.x, box.y + box.height),
      transformPoint(matrix, box.x + box.width, box.y + box.height),
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } catch {
    return null;
  }
}

function directRectBounds(element: Element): Bounds | null {
  if (element.tagName.toLowerCase() !== 'rect') return null;

  const x = Number(element.getAttribute('x') || 0);
  const y = Number(element.getAttribute('y') || 0);
  const width = Number(element.getAttribute('width') || 0);
  const height = Number(element.getAttribute('height') || 0);

  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function selectRenderableSlots(slots: BoundElement[], handledFields: Set<CoverField>) {
  const selected = new Map<CoverField, BoundElement>();

  slots.forEach((slot) => {
    if (handledFields.has(slot.field)) return;
    if (!isVectorTextLeaf(slot.element) && !isDynamicSlot(slot.element)) return;

    const current = selected.get(slot.field);
    if (!current) {
      selected.set(slot.field, slot);
      return;
    }

    // Preserve the original vector placeholder when it exists. The invisible
    // rectangle is the fallback used by the cleaned SVG templates.
    if (isVectorTextLeaf(slot.element) && isDynamicSlot(current.element)) {
      selected.set(slot.field, slot);
    }
  });

  return Array.from(selected.values());
}

function renderNonTextSlots(
  doc: Document,
  slots: BoundElement[],
  values: CoverTextValues,
  handledFields: Set<CoverField>,
  theme?: PdfTheme,
) {
  if (typeof document === 'undefined' || !document.body) return;

  const candidates = selectRenderableSlots(slots, handledFields)
    .filter(({ field }) => Boolean(valueForField(values, field)));
  if (!candidates.length) return;

  candidates.forEach(({ element }, index) => {
    element.setAttribute('data-cover-bind-id', `cover-bind-${index}`);
  });

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';

  const renderedSvg = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
  renderedSvg.style.display = 'block';
  host.appendChild(renderedSvg);
  document.body.appendChild(host);

  try {
    candidates.forEach(({ element, field }, index) => {
      const value = valueForField(values, field);
      if (!value) return;

      const renderedElement = renderedSvg.querySelector(
        `[data-cover-bind-id="cover-bind-${index}"]`,
      ) as SVGGraphicsElement | null;
      const bounds = renderedElement
        ? boundsFromRenderedElement(renderedElement) || directRectBounds(element)
        : directRectBounds(element);
      if (!bounds) return;

      const text = doc.createElementNS(SVG_NS, 'text');
      const fontSize = calculateFontSize(field, value, bounds.width, bounds.height);
      const configuredAnchor = element.getAttribute('data-text-anchor');
      const anchor = configuredAnchor || (field === 'powerKwp' ? 'middle' : 'start');
      const x = anchor === 'middle' ? bounds.x + bounds.width / 2 : bounds.x;

      text.setAttribute('x', String(x));
      text.setAttribute('y', String(bounds.y + bounds.height / 2));
      text.setAttribute('text-anchor', anchor);
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
      text.setAttribute('font-size', fontSize.toFixed(2));
      text.setAttribute('font-weight', fontWeightForField(field));
      text.setAttribute('fill', resolveFill(element, theme));
      text.setAttribute('data-bind', field);
      text.setAttribute('pointer-events', 'none');
      text.textContent = value;

      // Generated text is appended to the SVG root so it does not inherit the
      // opacity/display of the invisible dynamic_slots group.
      doc.documentElement.appendChild(text);

      // Only the exact vector glyph placeholder is hidden. Slot rectangles,
      // groups, icons and static labels remain untouched.
      if (isVectorTextLeaf(element)) {
        element.setAttribute('display', 'none');
      }

      handledFields.add(field);
    });
  } finally {
    host.remove();
    doc.querySelectorAll('[data-cover-bind-id]').forEach((element) => {
      element.removeAttribute('data-cover-bind-id');
    });
  }
}

export function applyDynamicTexts(
  doc: Document,
  values: CoverTextValues,
  theme?: PdfTheme,
) {
  const slots = collectBoundElements(doc);
  const handledFields = new Set<CoverField>();

  slots.forEach(({ element, field }) => {
    if (!element.matches('text, tspan')) return;
    const value = valueForField(values, field);
    if (!value) return;

    element.textContent = value;
    element.setAttribute('data-bind', field);
    handledFields.add(field);
  });

  renderNonTextSlots(doc, slots, values, handledFields, theme);
}
