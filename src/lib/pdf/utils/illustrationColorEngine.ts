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

const DEFAULT_OUTPUT_WIDTH = 1800;
const DEFAULT_PADDING = 18;
const BACKGROUND_WHITE_THRESHOLD = 245;
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

    // O branco é preservado aqui. Apenas o branco conectado às bordas será
    // removido depois, evitando apagar detalhes brancos internos da ilustração.
    if (
      pixel.r >= BACKGROUND_WHITE_THRESHOLD
      && pixel.g >= BACKGROUND_WHITE_THRESHOLD
      && pixel.b >= BACKGROUND_WHITE_THRESHOLD
    ) continue;

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

    // A paleta de origem é reduzida. O limite inclui antialiasing das bordas,
    // mas não captura tons claros que pertencem ao conteúdo.
    if (closestDistance > 32_400) continue;

    pixels[index] = closest.target.r;
    pixels[index + 1] = closest.target.g;
    pixels[index + 2] = closest.target.b;
  }

  return imageData;
}

function isConnectedBackgroundPixel(pixels: Uint8ClampedArray, pixelIndex: number) {
  const offset = pixelIndex * 4;
  return (
    pixels[offset + 3] > 0
    && pixels[offset] >= BACKGROUND_WHITE_THRESHOLD
    && pixels[offset + 1] >= BACKGROUND_WHITE_THRESHOLD
    && pixels[offset + 2] >= BACKGROUND_WHITE_THRESHOLD
  );
}

/**
 * Remove apenas o fundo branco conectado às extremidades da imagem. Assim a
 * ilustração pode integrar o layout como um elemento, sem apagar áreas brancas
 * fechadas que façam parte de roupas, documentos ou equipamentos.
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
      if (alpha === 0) continue;
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

  // Assim como a capa, o asset é entregue ao PDF já na densidade necessária
  // para impressão/zoom, em vez de ampliar o bitmap pequeno dentro da página.
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
    source,
    theme.primary,
    theme.secondary,
    theme.accent,
    theme.neutral,
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
    const themedImageData = removeConnectedWhiteBackground(recolorImageData(imageData, theme));
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
    applyPdfThemeToIllustration(implementationTimelineImage, theme, { outputWidth: 2100 }),
    applyPdfThemeToIllustration(financialReturnImage, theme, { outputWidth: 1800 }),
  ]);

  return { kit, timeline, financial };
}

export const defaultProposalIllustrationImages: ProposalIllustrationImages = {
  kit: kitEquipmentImage,
  timeline: implementationTimelineImage,
  financial: financialReturnImage,
};
