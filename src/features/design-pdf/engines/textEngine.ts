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

const SVG_NS = 'http://www.w3.org/2000/svg';

const FIELD_ALIASES: Record<CoverField, string[]> = {
  clientName: [
    'slot clientname',
    'slot client name',
    'clientname',
    'client name',
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

  if (/^validade\s*:?\s*(\d+|x+)\s*dias?$/i.test(clean)) {
    return 'validityText';
  }

  return null;
}

function collectBoundElements(doc: Document): BoundElement[] {
  const result: BoundElement[] = [];
  const visited = new Set<Element>();

  doc.querySelectorAll('[data-bind], [id], text, tspan').forEach((element) => {
    if (visited.has(element)) return;
    visited.add(element);

    const explicitField = fieldFromBinding(element.getAttribute('data-bind'))
      || fieldFromBinding(element.getAttribute('id'));
    const textField = element.matches('text, tspan')
      ? fieldFromVisibleText(element.textContent || '')
      : null;
    const field = explicitField || textField;

    if (field) result.push({ element, field });
  });

  return result;
}

function resolveFill(element: Element) {
  const directFill = element.getAttribute('fill');
  if (directFill && directFill !== 'none' && !directFill.startsWith('url(')) return directFill;

  const childWithFill = element.querySelector('[fill]:not([fill="none"])');
  const childFill = childWithFill?.getAttribute('fill');
  if (childFill && !childFill.startsWith('url(')) return childFill;

  let parent = element.parentElement;
  while (parent) {
    const parentFill = parent.getAttribute('fill');
    if (parentFill && parentFill !== 'none' && !parentFill.startsWith('url(')) return parentFill;
    parent = parent.parentElement;
  }

  return '#1E1E1E';
}

function fontWeightForField(field: CoverField) {
  return field === 'clientName' || field === 'powerKwp' ? '700' : '500';
}

function calculateFontSize(field: CoverField, value: string, width: number, height: number) {
  const widthFactor = field === 'powerKwp' ? 0.62 : 0.56;
  const widthBased = width / Math.max(value.length * widthFactor, 1);
  const heightBased = height * 0.88;
  const maxSize = field === 'powerKwp' ? 24 : 18;
  return Math.max(7, Math.min(widthBased, heightBased, maxSize));
}

function replaceVectorSlots(doc: Document, slots: BoundElement[], values: CoverTextValues) {
  if (typeof document === 'undefined' || !document.body) return;

  const vectorSlots = slots.filter(({ element, field }) => {
    return !element.matches('text, tspan') && Boolean(valueForField(values, field));
  });
  if (!vectorSlots.length) return;

  vectorSlots.forEach(({ element }, index) => {
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
    vectorSlots.forEach(({ element, field }, index) => {
      const value = valueForField(values, field);
      if (!value) return;

      const renderedElement = renderedSvg.querySelector(
        `[data-cover-bind-id="cover-bind-${index}"]`,
      ) as SVGGraphicsElement | null;
      if (!renderedElement || typeof renderedElement.getBBox !== 'function') return;

      let box: DOMRect;
      try {
        box = renderedElement.getBBox() as unknown as DOMRect;
      } catch {
        return;
      }

      if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || box.width <= 0 || box.height <= 0) {
        return;
      }

      const text = doc.createElementNS(SVG_NS, 'text');
      const fontSize = calculateFontSize(field, value, box.width, box.height);
      text.setAttribute('x', String(box.x + box.width / 2));
      text.setAttribute('y', String(box.y + box.height / 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
      text.setAttribute('font-size', fontSize.toFixed(2));
      text.setAttribute('font-weight', fontWeightForField(field));
      text.setAttribute('fill', resolveFill(element));
      text.setAttribute('data-bind', field);
      text.setAttribute('pointer-events', 'none');

      const transform = element.getAttribute('transform');
      if (transform) text.setAttribute('transform', transform);

      text.textContent = value;
      element.setAttribute('display', 'none');
      element.removeAttribute('data-cover-bind-id');
      element.parentNode?.insertBefore(text, element.nextSibling);
    });
  } finally {
    host.remove();
    doc.querySelectorAll('[data-cover-bind-id]').forEach((element) => {
      element.removeAttribute('data-cover-bind-id');
    });
  }
}

export function applyDynamicTexts(doc: Document, values: CoverTextValues) {
  const slots = collectBoundElements(doc);

  slots.forEach(({ element, field }) => {
    if (!element.matches('text, tspan')) return;
    const value = valueForField(values, field);
    if (value) element.textContent = value;
  });

  replaceVectorSlots(doc, slots, values);
}
