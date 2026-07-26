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
  applyCoverPhoto(doc, input.coverImageUrl, input.coverImageTransform);
  applyLogo(doc, input.logoUrl, input.logoTransform);

  if (input.modelId) makeIdsUnique(doc, input.modelId);

  return new XMLSerializer().serializeToString(doc);
}
