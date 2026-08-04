import type { PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';
import kitEquipmentImage from '../../../assets/pdf-art/kitEquipmentImage';
import implementationTimelineImage from '../../../assets/pdf-art/implementationTimelineImage';
import {
  resolveCoverPaint,
  type CoverTheme,
} from '../../../features/design-pdf/engines/colorEngine';
import type { PdfTheme } from '../../../types/pdfModels';

export interface ProposalIllustrationImages {
  kit: string;
  timeline: string;
  financial: string;
}

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type IllustrationColorRole = 'primary' | 'accent' | 'neutral';

const ILLUSTRATION_ORIGINAL_THEME: PdfTheme = {
  primary: '#0076DD',
  secondary: '#DEC488',
  accent: '#FACB5C',
  neutral: '#000000',
};

const SOURCE_ROLE_COLORS: Array<{
  role: IllustrationColorRole;
  source: string;
  rgb: Rgb;
}> = [
  { role: 'primary', source: ILLUSTRATION_ORIGINAL_THEME.primary, rgb: { r: 0, g: 118, b: 221 } },
  { role: 'accent', source: ILLUSTRATION_ORIGINAL_THEME.accent, rgb: { r: 250, g: 203, b: 92 } },
  { role: 'neutral', source: ILLUSTRATION_ORIGINAL_THEME.neutral, rgb: { r: 0, g: 0, b: 0 } },
];

const themedIllustrationCache = new Map<string, Promise<string>>();

function toPdfTheme(theme: PdfDocumentTheme): PdfTheme {
  return {
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,
    neutral: theme.neutral,
  };
}

function hexToRgb(value: string): Rgb {
  const normalized = value.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function colorDistanceSquared(first: Rgb, second: Rgb) {
  return (
    (first.r - second.r) ** 2
    + (first.g - second.g) ** 2
    + (first.b - second.b) ** 2
  );
}

function buildRoleTargets(theme: PdfDocumentTheme) {
  const coverTheme: CoverTheme = {
    current: toPdfTheme(theme),
    original: ILLUSTRATION_ORIGINAL_THEME,
  };

  return SOURCE_ROLE_COLORS.map((entry) => {
    const resolved = resolveCoverPaint(entry.source, coverTheme) || coverTheme.current[entry.role];
    return {
      ...entry,
      target: hexToRgb(resolved),
    };
  });
}

function loadIllustration(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar a ilustração do PDF.'));
    image.src = source;
  });
}

function recolorImageData(imageData: ImageData, theme: PdfDocumentTheme) {
  const targets = buildRoleTargets(theme);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha === 0) continue;

    const pixel = {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2],
    };

    // Branco pertence ao fundo da própria arte e não deve receber tema.
    if (pixel.r >= 245 && pixel.g >= 245 && pixel.b >= 245) continue;

    let closest = targets[0];
    let closestDistance = colorDistanceSquared(pixel, closest.rgb);

    for (let targetIndex = 1; targetIndex < targets.length; targetIndex += 1) {
      const candidate = targets[targetIndex];
      const distance = colorDistanceSquared(pixel, candidate.rgb);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }

    // As imagens foram exportadas com paleta reduzida. O limite também inclui
    // pixels de suavização das bordas sem capturar o fundo branco.
    if (closestDistance > 32_400) continue;

    pixels[index] = closest.target.r;
    pixels[index + 1] = closest.target.g;
    pixels[index + 2] = closest.target.b;
  }

  return imageData;
}

function buildCacheKey(source: string, theme: PdfDocumentTheme) {
  return [
    source,
    theme.primary,
    theme.secondary,
    theme.accent,
    theme.neutral,
  ].join('|');
}

export async function applyPdfThemeToIllustration(
  source: string,
  theme: PdfDocumentTheme,
): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return source;

  const cacheKey = buildCacheKey(source, theme);
  const cached = themedIllustrationCache.get(cacheKey);
  if (cached) return cached;

  const recolored = (async () => {
    const image = await loadIllustration(source);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return source;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    context.putImageData(recolorImageData(imageData, theme), 0, 0);
    return canvas.toDataURL('image/png');
  })().catch((error) => {
    console.warn('Não foi possível aplicar o tema à ilustração do PDF.', error);
    return source;
  });

  themedIllustrationCache.set(cacheKey, recolored);
  return recolored;
}

export async function buildProposalIllustrationImages(
  theme: PdfDocumentTheme,
): Promise<ProposalIllustrationImages> {
  const [kit, timeline, financial] = await Promise.all([
    applyPdfThemeToIllustration(kitEquipmentImage, theme),
    applyPdfThemeToIllustration(implementationTimelineImage, theme),
    applyPdfThemeToIllustration(financialReturnImage, theme),
  ]);

  return { kit, timeline, financial };
}

export const defaultProposalIllustrationImages: ProposalIllustrationImages = {
  kit: kitEquipmentImage,
  timeline: implementationTimelineImage,
  financial: financialReturnImage,
};
