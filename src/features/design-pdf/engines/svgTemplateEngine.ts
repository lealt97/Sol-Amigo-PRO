import { TransformConfig } from '../types/pdfDesignTypes';
import { CoverTheme, applyTheme } from './colorEngine';
import { applyCoverPhoto } from './photoEngine';
import { applyLogo } from './logoEngine';
import { CoverTextValues, applyDynamicTexts } from './textEngine';
import { makeIdsUnique } from './idEngine';

export type BuildSvgTemplateInput = {
  svgSource: string;
  theme: CoverTheme;
  texts?: CoverTextValues;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  logoTransform?: TransformConfig;
  coverImageTransform?: TransformConfig;
  modelId?: string;
};

type CoverPowerTextLayout = {
  coverSelector: string;
  fontScale: number;
  minFontSize: number;
  maxFontSize: number;
  anchor?: 'start' | 'middle' | 'end';
};

type SvgBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const COVER_04_SIDE_LABEL_SOURCE_ID = 'Sistema de Energia sola Fotovoltaica';
const COVER_04_SIDE_LABEL_ID = 'Sistema de Energia Solar Fotovoltaica';
const COVER_04_SIDE_LABEL_TEXT = 'Sistema de Energia Solar Fotovoltaica';
const COVER_04_SIDE_LABEL_FALLBACK_BOUNDS: SvgBounds = {
  x: 25,
  y: 248,
  width: 18,
  height: 374,
};

// Ajustes visuais devem ser declarados por capa. As coordenadas x/y continuam
// pertencendo ao slot_systemPower de cada SVG e nunca são copiadas de outro campo.
const COVER_POWER_TEXT_LAYOUTS: CoverPowerTextLayout[] = [
  {
    coverSelector: '[id="A4 - 1"], [id="capa_1"]',
    fontScale: 1.15,
    minFontSize: 9,
    maxFontSize: 28,
    anchor: 'start',
  },
];

function applyStaticContrastOverrides(doc: Document) {
  const isCover06 = Boolean(
    doc.querySelector('[id="A4 - 6"], [id="capa_6"]'),
  );

  if (!isCover06) return;

  // The nominal-power value on cover 06 sits over the dark primary area.
  // Keep it pure white, like the label above it. White is intentionally
  // excluded from theme replacement so this contrast remains stable.
  doc.querySelectorAll('[data-bind="powerKwp"]').forEach((element) => {
    element.setAttribute('fill', '#FFFFFF');
    element.setAttribute('data-text-fill', '#FFFFFF');
  });
}

function applyCoverSpecificPowerTextLayout(doc: Document) {
  const layout = COVER_POWER_TEXT_LAYOUTS.find(({ coverSelector }) => (
    Boolean(doc.querySelector(coverSelector))
  ));
  if (!layout) return;

  const powerTexts = Array.from(
    doc.querySelectorAll('text[data-bind="powerKwp"], tspan[data-bind="powerKwp"]'),
  );

  powerTexts.forEach((element) => {
    // Preserva integralmente x e y definidos pelo slot próprio desta capa.
    if (layout.anchor) element.setAttribute('text-anchor', layout.anchor);

    const currentFontSize = Number.parseFloat(element.getAttribute('font-size') || '');
    if (Number.isFinite(currentFontSize) && currentFontSize > 0) {
      const enlargedFontSize = Math.min(
        layout.maxFontSize,
        Math.max(layout.minFontSize, currentFontSize * layout.fontScale),
      );
      element.setAttribute('font-size', enlargedFontSize.toFixed(2));
    }

    element.setAttribute('font-weight', '700');
    element.setAttribute('data-power-layout', 'cover-specific');
  });
}

function measureSvgElementBounds(doc: Document, elementId: string): SvgBounds | null {
  if (typeof document === 'undefined' || !document.body) return null;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';

  const renderedSvg = document.importNode(
    doc.documentElement,
    true,
  ) as unknown as SVGSVGElement;
  renderedSvg.style.display = 'block';
  host.appendChild(renderedSvg);
  document.body.appendChild(host);

  try {
    const renderedElement = renderedSvg.querySelector(
      `[id="${elementId}"]`,
    ) as SVGGraphicsElement | null;
    if (!renderedElement || typeof renderedElement.getBBox !== 'function') return null;

    const bounds = renderedElement.getBBox();
    if (bounds.width <= 0 || bounds.height <= 0) return null;

    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  } catch {
    return null;
  } finally {
    host.remove();
  }
}

function correctCover04SideLabel(doc: Document, accentColor: string) {
  const isCover04 = Boolean(
    doc.getElementById('capa_4')
    || doc.getElementById('A4 - 4'),
  );
  if (!isCover04) return;

  const originalLabel = doc.getElementById(COVER_04_SIDE_LABEL_SOURCE_ID);
  if (!originalLabel) return;

  const bounds = measureSvgElementBounds(
    doc,
    COVER_04_SIDE_LABEL_SOURCE_ID,
  ) || COVER_04_SIDE_LABEL_FALLBACK_BOUNDS;

  const correctedLabel = doc.createElementNS(SVG_NS, 'text');
  correctedLabel.setAttribute('id', COVER_04_SIDE_LABEL_ID);
  correctedLabel.setAttribute('data-cover-role', 'side-label');
  correctedLabel.setAttribute('data-color-role', 'accent');
  correctedLabel.setAttribute('x', String(-(bounds.y + bounds.height)));
  correctedLabel.setAttribute('y', String(bounds.x + bounds.width * 0.9));
  correctedLabel.setAttribute('transform', 'rotate(-90)');
  correctedLabel.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
  correctedLabel.setAttribute('font-size', String(Math.max(11, bounds.width * 0.95)));
  correctedLabel.setAttribute('font-weight', '400');
  correctedLabel.setAttribute('fill', accentColor);
  correctedLabel.setAttribute('textLength', String(bounds.height));
  correctedLabel.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  correctedLabel.setAttribute('pointer-events', 'none');
  correctedLabel.textContent = COVER_04_SIDE_LABEL_TEXT;

  // O texto original foi exportado pelo Figma como um único path vetorial.
  // A substituição mantém o mesmo retângulo visual, acrescenta o “r” ausente
  // em “Solar” e continua respondendo à cor destaque da capa.
  originalLabel.replaceWith(correctedLabel);
}

export function buildSvgTemplate(input: BuildSvgTemplateInput) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input.svgSource, 'image/svg+xml');

  // Dynamic vector placeholders must be read before recoloring the template.
  // Some Figma exports, including cover 06, place the power value inside the
  // primary-color group. Applying the theme first makes that value inherit the
  // background color and the generated text becomes visually invisible.
  applyDynamicTexts(doc, input.texts || {}, input.theme.current);
  applyCoverSpecificPowerTextLayout(doc);
  applyStaticContrastOverrides(doc);
  applyTheme(doc, input.theme);
  correctCover04SideLabel(doc, input.theme.current.accent);
  applyCoverPhoto(doc, input.coverImageUrl, input.coverImageTransform);
  applyLogo(doc, input.logoUrl, input.logoTransform);

  if (input.modelId) makeIdsUnique(doc, input.modelId);

  return new XMLSerializer().serializeToString(doc);
}
