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

export function buildSvgTemplate(input: BuildSvgTemplateInput) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input.svgSource, 'image/svg+xml');

  // Dynamic vector placeholders must be read before recoloring the template.
  // Some Figma exports, including cover 06, place the power value inside the
  // primary-color group. Applying the theme first makes that value inherit the
  // background color and the generated text becomes visually invisible.
  applyDynamicTexts(doc, input.texts || {}, input.theme.current);
  applyTheme(doc, input.theme);
  applyCoverPhoto(doc, input.coverImageUrl, input.coverImageTransform);
  applyLogo(doc, input.logoUrl, input.logoTransform);

  if (input.modelId) makeIdsUnique(doc, input.modelId);

  return new XMLSerializer().serializeToString(doc);
}
