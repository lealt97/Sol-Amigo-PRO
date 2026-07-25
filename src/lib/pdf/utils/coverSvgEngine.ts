import { PdfTheme, TransformConfig } from '../../../types/pdfModels';
import { buildSvgTemplate } from '../../../features/design-pdf/engines/svgTemplateEngine';

type CoverValues = {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  validityText?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverImageTransform?: TransformConfig;
  logoTransform?: TransformConfig;
};

type CoverTheme = {
  current: PdfTheme;
  original?: PdfTheme;
};

type DynamicTextField = 'clientName' | 'powerKwp' | 'cityState' | 'date' | 'validityText';

type DynamicTextSizing = {
  scale: number;
  maxSize: number;
};

const DYNAMIC_TEXT_SIZING: Record<DynamicTextField, DynamicTextSizing> = {
  clientName: { scale: 1.35, maxSize: 24 },
  powerKwp: { scale: 1.35, maxSize: 32 },
  cityState: { scale: 1.3, maxSize: 20 },
  date: { scale: 1.2, maxSize: 17 },
  validityText: { scale: 1.2, maxSize: 14 },
};

function readFontSize(element: Element) {
  const attributeValue = element.getAttribute('font-size');
  if (attributeValue) {
    const parsed = Number.parseFloat(attributeValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  const style = element.getAttribute('style') || '';
  const styleMatch = style.match(/(?:^|;)\s*font-size\s*:\s*([0-9.]+)/i);
  if (!styleMatch) return null;

  const parsed = Number.parseFloat(styleMatch[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeFontSize(element: Element, fontSize: number) {
  const formattedSize = fontSize.toFixed(2);
  const style = element.getAttribute('style') || '';

  if (/(?:^|;)\s*font-size\s*:/i.test(style)) {
    element.setAttribute(
      'style',
      style.replace(
        /((?:^|;)\s*font-size\s*:\s*)[0-9.]+(?:px|pt)?/i,
        `$1${formattedSize}px`,
      ),
    );
  }

  element.setAttribute('font-size', formattedSize);
}

function enlargeDynamicCoverTexts(svgText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  doc.querySelectorAll('text[data-bind], tspan[data-bind]').forEach((element) => {
    const field = element.getAttribute('data-bind') as DynamicTextField | null;
    if (!field || !(field in DYNAMIC_TEXT_SIZING)) return;

    if (element.tagName.toLowerCase() === 'tspan') {
      const parentText = element.closest('text[data-bind]');
      if (parentText) return;
    }

    const currentSize = readFontSize(element);
    if (!currentSize) return;

    const sizing = DYNAMIC_TEXT_SIZING[field];
    writeFontSize(element, Math.min(currentSize * sizing.scale, sizing.maxSize));
  });

  return new XMLSerializer().serializeToString(doc);
}

export function buildCoverSvg(
  svgSource: string,
  theme: CoverTheme,
  values: CoverValues = {},
  modelId?: string,
  _presetId?: string,
) {
  const svg = buildSvgTemplate({
    svgSource,
    theme,
    texts: {
      clientName: values.clientName,
      powerKwp: values.powerKwp,
      cityState: values.cityState,
      date: values.date,
      validityText: values.validityText,
    },
    logoUrl: values.logoUrl,
    coverImageUrl: values.coverImageUrl,
    logoTransform: values.logoTransform,
    coverImageTransform: values.coverImageTransform,
    modelId,
  });

  return enlargeDynamicCoverTexts(svg);
}
