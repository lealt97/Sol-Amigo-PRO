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

function applyPowerTextLayout(doc: Document) {
  const powerTexts = Array.from(
    doc.querySelectorAll('text[data-bind="powerKwp"], tspan[data-bind="powerKwp"]'),
  );
  if (!powerTexts.length) return;

  const alignmentReference = doc.querySelector(
    'text[data-bind="clientName"], tspan[data-bind="clientName"], text[data-bind="cityState"], tspan[data-bind="cityState"]',
  );
  const referenceX = alignmentReference?.getAttribute('x');

  powerTexts.forEach((element) => {
    // Potência deve começar na mesma margem dos dados de Localização e Cliente,
    // em vez de ficar centralizada dentro do espaço reservado pelo template.
    element.setAttribute('text-anchor', 'start');
    if (referenceX) element.setAttribute('x', referenceX);

    const currentFontSize = Number.parseFloat(element.getAttribute('font-size') || '');
    if (Number.isFinite(currentFontSize) && currentFontSize > 0) {
      const enlargedFontSize = Math.min(28, Math.max(9, currentFontSize * 1.15));
      element.setAttribute('font-size', enlargedFontSize.toFixed(2));
    }

    element.setAttribute('font-weight', '700');
    element.setAttribute('data-power-layout', 'aligned-and-enlarged');
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
  applyPowerTextLayout(doc);
  applyStaticContrastOverrides(doc);
  applyTheme(doc, input.theme);
  applyCoverPhoto(doc, input.coverImageUrl, input.coverImageTransform);
  applyLogo(doc, input.logoUrl, input.logoTransform);

  if (input.modelId) makeIdsUnique(doc, input.modelId);

  return new XMLSerializer().serializeToString(doc);
}
