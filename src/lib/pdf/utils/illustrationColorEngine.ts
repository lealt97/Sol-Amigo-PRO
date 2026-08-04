import type { PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';
import kitEquipmentImage from '../../../assets/pdf-art/kitEquipmentImage';
import implementationTimelineImage from '../../../assets/pdf-art/implementationTimelineImage';
import type { PdfTheme } from '../../../types/pdfModels';

export interface ProposalIllustrationImages {
  kit: string;
  timeline: string;
  financial: string;
}

export interface IllustrationRenderOptions {
  /** Largura final do bitmap entregue ao preview/PDF. */
  outputWidth?: number;
  /** Respiro transparente ao redor do conteúdo depois do recorte. */
  padding?: number;
}

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type IllustrationColorRole = 'primary' | 'accent' | 'neutral';

type PixelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FIXED_ILLUSTRATION_BLACK = '#000000';
const WHITE_RGB: Rgb = { r: 255, g: 255, b: 255 };
const ILLUSTRATION_CACHE_VERSION = 'real-bounds-v2';

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
  { role: 'neutral', source: '#06121C', rgb: { r: 6, g: 18, b: 28 } },
];

const DEFAULT_OUTPUT_WIDTH = 1800;
const DEFAULT_PADDING = 18;
const BACKGROUND_MIN_CHANNEL = 224;
const BACKGROUND_MAX_CHROMA = 40;
const CONTENT_ALPHA_THRESHOLD = 8;
const MAX_ROLE_DISTANCE = 32_400;
const themedIllustrationCache = new Map<string, Promise<string>>();

/**
 * O preview e o PDF final usam este mesmo contrato. Alterar o enquadramento
 * somente em um dos renderizadores faria a arte visualizada divergir do arquivo.
 */
export const TIMELINE_ILLUSTRATION_RENDER_OPTIONS: Required<IllustrationRenderOptions> = {
  outputWidth: 2100,
  padding: 24,
};

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

function colorLuminance(color: Rgb) {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

function mixRgb(source: Rgb, target: Rgb, targetWeight: number): Rgb {
  const weight = Math.max(0, Math.min(1, targetWeight));
  return {
    r: Math.round(source.r * (1 - weight) + target.r * weight),
    g: Math.round(source.g * (1 - weight) + target.g * weight),
    b: Math.round(source.b * (1 - weight) + target.b * weight),
  };
}

function isLightBackgroundColor(pixel: Rgb) {
  const minimum = Math.min(pixel.r, pixel.g, pixel.b);
  const maximum = Math.max(pixel.r, pixel.g, pixel.b);
  return minimum >= BACKGROUND_MIN_CHANNEL && maximum - minimum <= BACKGROUND_MAX_CHROMA;
}

function getClosestSourceRole(pixel: Rgb) {
  let closest = SOURCE_ROLE_COLORS[0];
  let closestDistance = colorDistanceSquared(pixel, closest.rgb);

  for (let index = 1; index < SOURCE_ROLE_COLORS.length; index += 1) {
    const candidate = SOURCE_ROLE_COLORS[index];
    const distance = colorDistanceSquared(pixel, candidate.rgb);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return { closest, closestDistance };
}

function getPrimaryTintWeight(pixel: Rgb, sourceRoleColor: Rgb) {
  const sourceLuminance = colorLuminance(sourceRoleColor);
  const pixelLuminance = colorLuminance(pixel);
  if (pixelLuminance <= sourceLuminance) return 0;

  return Math.min(
    0.92,
    (pixelLuminance - sourceLuminance) / Math.max(1, 255 - sourceLuminance),
  );
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
  const primaryTarget = hexToRgb(theme.primary);
  const fixedBlackTarget = hexToRgb(FIXED_ILLUSTRATION_BLACK);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha <= CONTENT_ALPHA_THRESHOLD) continue;

    const pixel = {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2],
    };

    // O fundo já foi removido antes da recoloração. Áreas claras internas
    // permanecem claras, em vez de virarem um bloco escuro da cor principal.
    if (isLightBackgroundColor(pixel)) continue;

    const { closest, closestDistance } = getClosestSourceRole(pixel);
    if (closestDistance > MAX_ROLE_DISTANCE) continue;

    // Não usamos resolveCoverPaint: preto é sempre preto e qualquer cor de
    // marca acompanha somente a cor principal, preservando seus tons claros.
    const target = closest.role === 'neutral'
      ? fixedBlackTarget
      : mixRgb(primaryTarget, WHITE_RGB, getPrimaryTintWeight(pixel, closest.rgb));

    pixels[index] = target.r;
    pixels[index + 1] = target.g;
    pixels[index + 2] = target.b;
  }

  return imageData;
}

function isConnectedBackgroundPixel(pixels: Uint8ClampedArray, pixelIndex: number) {
  const offset = pixelIndex * 4;
  if (pixels[offset + 3] === 0) return false;

  return isLightBackgroundColor({
    r: pixels[offset],
    g: pixels[offset + 1],
    b: pixels[offset + 2],
  });
}

/**
 * Remove o fundo claro conectado às extremidades antes de aplicar o tema.
 * Isso inclui os tons quase brancos/azulados presentes nos PNGs originais,
 * mas preserva áreas claras fechadas que fazem parte do desenho.
 */
function removeConnectedWhiteBackground(imageData: ImageData) {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex] || !isConnectedBackgroundPixel(data, pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    data[pixelIndex * 4 + 3] = 0;

    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  return imageData;
}

function findOpaqueBounds(imageData: ImageData, padding: number): PixelBounds {
  const { width, height, data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= CONTENT_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height };
  }

  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const right = Math.min(width - 1, maxX + padding);
  const bottom = Math.min(height - 1, maxY + padding);

  return {
    x,
    y,
    width: right - x + 1,
    height: bottom - y + 1,
  };
}

function renderHighResolutionIllustration(
  sourceCanvas: HTMLCanvasElement,
  bounds: PixelBounds,
  outputWidth: number,
) {
  const targetWidth = Math.max(bounds.width, Math.round(outputWidth));
  const targetHeight = Math.max(1, Math.round(targetWidth * bounds.height / bounds.width));
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;

  const context = outputCanvas.getContext('2d');
  if (!context) return sourceCanvas.toDataURL('image/png');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, targetWidth, targetHeight);
  context.drawImage(
    sourceCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return outputCanvas.toDataURL('image/png');
}

function buildCacheKey(
  source: string,
  theme: PdfDocumentTheme,
  options: Required<IllustrationRenderOptions>,
) {
  return [
    ILLUSTRATION_CACHE_VERSION,
    source,
    theme.primary,
    options.outputWidth,
    options.padding,
  ].join('|');
}

export async function applyPdfThemeToIllustration(
  source: string,
  theme: PdfDocumentTheme,
  options: IllustrationRenderOptions = {},
): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return source;

  const resolvedOptions: Required<IllustrationRenderOptions> = {
    outputWidth: options.outputWidth ?? DEFAULT_OUTPUT_WIDTH,
    padding: options.padding ?? DEFAULT_PADDING,
  };
  const cacheKey = buildCacheKey(source, theme, resolvedOptions);
  const cached = themedIllustrationCache.get(cacheKey);
  if (cached) return cached;

  const rendered = (async () => {
    const image = await loadIllustration(source);
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.naturalWidth || image.width;
    sourceCanvas.height = image.naturalHeight || image.height;

    const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) return source;

    context.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
    const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    // A ordem é obrigatória: remover o fundo primeiro impede que tons quase
    // brancos sejam recoloridos e passem a contaminar os limites da arte.
    const withoutBackground = removeConnectedWhiteBackground(imageData);
    const themedImageData = recolorImageData(withoutBackground, theme);

    context.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    context.putImageData(themedImageData, 0, 0);

    const bounds = findOpaqueBounds(themedImageData, resolvedOptions.padding);
    return renderHighResolutionIllustration(
      sourceCanvas,
      bounds,
      resolvedOptions.outputWidth,
    );
  })().catch((error) => {
    console.warn('Não foi possível renderizar a ilustração temática do PDF.', error);
    return source;
  });

  themedIllustrationCache.set(cacheKey, rendered);
  return rendered;
}

export async function buildProposalIllustrationImages(
  theme: PdfDocumentTheme,
): Promise<ProposalIllustrationImages> {
  const [kit, timeline, financial] = await Promise.all([
    applyPdfThemeToIllustration(kitEquipmentImage, theme, { outputWidth: 1800 }),
    applyPdfThemeToIllustration(
      implementationTimelineImage,
      theme,
      TIMELINE_ILLUSTRATION_RENDER_OPTIONS,
    ),
    applyPdfThemeToIllustration(financialReturnImage, theme, { outputWidth: 1800 }),
  ]);

  return { kit, timeline, financial };
}

export const defaultProposalIllustrationImages: ProposalIllustrationImages = {
  kit: kitEquipmentImage,
  timeline: implementationTimelineImage,
  financial: financialReturnImage,
};
