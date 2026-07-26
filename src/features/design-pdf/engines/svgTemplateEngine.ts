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

type MeasuredSubpath = {
  d: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type VectorGlyph = {
  subpaths: MeasuredSubpath[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const COVER_04_SIDE_LABEL_SOURCE_ID = 'Sistema de Energia sola Fotovoltaica';
const COVER_04_SIDE_LABEL_CORRECT_ID = 'Sistema de Energia Solar Fotovoltaica';
const COVER_04_SOURCE_TEXT = 'Sistema de Energia sola Fotovoltaica';
const COVER_04_SOURCE_R_INDEX = 12;
const COVER_04_TARGET_PREVIOUS_INDEX = 19;
const COVER_04_TARGET_NEXT_INDEX = 20;
const VECTOR_STYLE_ATTRIBUTES = [
  'fill',
  'stroke',
  'fill-rule',
  'clip-rule',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
] as const;

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

function splitSvgPathIntoSubpaths(pathData: string) {
  return pathData.match(/[Mm][^Mm]*/g)?.map((subpath) => subpath.trim()) || [];
}

function verticalIntervalsOverlap(a: MeasuredSubpath | VectorGlyph, b: MeasuredSubpath) {
  const aMinY = 'minY' in a ? a.minY : a.y;
  const aMaxY = 'maxY' in a ? a.maxY : a.y + a.height;
  const bMinY = b.y;
  const bMaxY = b.y + b.height;
  return Math.min(aMaxY, bMaxY) - Math.max(aMinY, bMinY) > 0.05;
}

function buildGlyph(subpaths: MeasuredSubpath[]): VectorGlyph {
  const minX = Math.min(...subpaths.map((subpath) => subpath.x));
  const minY = Math.min(...subpaths.map((subpath) => subpath.y));
  const maxX = Math.max(...subpaths.map((subpath) => subpath.x + subpath.width));
  const maxY = Math.max(...subpaths.map((subpath) => subpath.y + subpath.height));

  return {
    subpaths,
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function groupSubpathsIntoGlyphs(subpaths: MeasuredSubpath[]) {
  const glyphs: VectorGlyph[] = [];

  subpaths.forEach((subpath) => {
    const currentGlyph = glyphs[glyphs.length - 1];
    if (currentGlyph && verticalIntervalsOverlap(currentGlyph, subpath)) {
      glyphs[glyphs.length - 1] = buildGlyph([...currentGlyph.subpaths, subpath]);
      return;
    }

    glyphs.push(buildGlyph([subpath]));
  });

  return glyphs;
}

function measureVectorGlyphs(pathData: string) {
  if (typeof document === 'undefined' || !document.body) return [];

  const subpathData = splitSvgPathIntoSubpaths(pathData);
  if (!subpathData.length) return [];

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '595');
  svg.setAttribute('height', '842');
  svg.setAttribute('viewBox', '0 0 595 842');
  host.appendChild(svg);
  document.body.appendChild(host);

  try {
    const measured = subpathData.flatMap((d): MeasuredSubpath[] => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);

      try {
        const bounds = path.getBBox();
        if (bounds.width <= 0 || bounds.height <= 0) return [];
        return [{
          d,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }];
      } catch {
        return [];
      }
    });

    return groupSubpathsIntoGlyphs(measured);
  } finally {
    host.remove();
  }
}

function copyVectorStyle(source: Element, target: Element) {
  VECTOR_STYLE_ATTRIBUTES.forEach((attribute) => {
    const value = source.getAttribute(attribute);
    if (value) target.setAttribute(attribute, value);
  });
}

function createGlyphPath(
  doc: Document,
  source: Element,
  glyph: VectorGlyph,
  id: string,
  translateY = 0,
) {
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('id', id);
  path.setAttribute('d', glyph.subpaths.map((subpath) => subpath.d).join(' '));
  path.setAttribute('data-color-role', 'accent');
  if (Math.abs(translateY) > 0.0001) {
    path.setAttribute('transform', `translate(0 ${translateY.toFixed(4)})`);
  }
  copyVectorStyle(source, path);
  return path;
}

function rebuildCover04SideLabelVector(doc: Document) {
  const isCover04 = Boolean(
    doc.getElementById('capa_4')
    || doc.getElementById('A4 - 4'),
  );
  if (!isCover04) return;

  const originalLabel = doc.getElementById(COVER_04_SIDE_LABEL_SOURCE_ID);
  if (!originalLabel || originalLabel.tagName.toLowerCase() !== 'path') return;
  if (doc.querySelector('[data-cover04-solar-corrected="true"]')) return;

  const pathData = originalLabel.getAttribute('d');
  if (!pathData) return;

  const glyphs = measureVectorGlyphs(pathData);
  const expectedGlyphCount = COVER_04_SOURCE_TEXT.replace(/\s/g, '').length;
  if (glyphs.length !== expectedGlyphCount) return;

  const sourcePreviousGlyph = glyphs[COVER_04_SOURCE_R_INDEX - 1];
  const sourceRGlyph = glyphs[COVER_04_SOURCE_R_INDEX];
  const targetPreviousGlyph = glyphs[COVER_04_TARGET_PREVIOUS_INDEX];
  if (!sourcePreviousGlyph || !sourceRGlyph || !targetPreviousGlyph) return;

  // Usa exatamente o avanço vertical entre “e” e “r” em “Energia”.
  const sourceAdvanceY = sourceRGlyph.centerY - sourcePreviousGlyph.centerY;
  if (!Number.isFinite(sourceAdvanceY) || Math.abs(sourceAdvanceY) < 0.05) return;

  const copiedRTargetCenterY = targetPreviousGlyph.centerY + sourceAdvanceY;
  const copiedRTranslateY = copiedRTargetCenterY - sourceRGlyph.centerY;

  const correctedGroup = doc.createElementNS(SVG_NS, 'g');
  correctedGroup.setAttribute('id', COVER_04_SIDE_LABEL_CORRECT_ID);
  correctedGroup.setAttribute('data-cover-role', 'side-label');
  correctedGroup.setAttribute('data-color-role', 'accent');
  correctedGroup.setAttribute('data-cover04-solar-corrected', 'true');

  const originalTransform = originalLabel.getAttribute('transform');
  if (originalTransform) correctedGroup.setAttribute('transform', originalTransform);

  glyphs.forEach((glyph, index) => {
    if (index === COVER_04_TARGET_NEXT_INDEX) {
      const copiedR = createGlyphPath(
        doc,
        originalLabel,
        sourceRGlyph,
        `${COVER_04_SIDE_LABEL_CORRECT_ID} - r`,
        copiedRTranslateY,
      );
      copiedR.setAttribute('data-cover04-solar-r', 'true');
      correctedGroup.appendChild(copiedR);
    }

    // Todos os glifos posteriores ao ponto de inserção descem pelo mesmo avanço.
    // Isso preserva o espaço original entre “sola” e “Fotovoltaica” depois que
    // “sola” recebe o novo “r”, sem colar as palavras seguintes.
    const tailTranslateY = index >= COVER_04_TARGET_NEXT_INDEX
      ? sourceAdvanceY
      : 0;
    const glyphPath = createGlyphPath(
      doc,
      originalLabel,
      glyph,
      `${COVER_04_SIDE_LABEL_CORRECT_ID} - glyph-${index}`,
      tailTranslateY,
    );
    if (index >= COVER_04_TARGET_NEXT_INDEX) {
      glyphPath.setAttribute('data-cover04-shifted-tail', 'true');
    }
    correctedGroup.appendChild(glyphPath);
  });

  originalLabel.replaceWith(correctedGroup);
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
  rebuildCover04SideLabelVector(doc);
  applyCoverPhoto(doc, input.coverImageUrl, input.coverImageTransform);
  applyLogo(doc, input.logoUrl, input.logoTransform);

  if (input.modelId) makeIdsUnique(doc, input.modelId);

  return new XMLSerializer().serializeToString(doc);
}
