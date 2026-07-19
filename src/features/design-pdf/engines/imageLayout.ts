export type ImageDimensions = {
  width: number;
  height: number;
};

export type ImageBounds = ImageDimensions & {
  x: number;
  y: number;
};

export type CoverPhotoTransform = {
  zoom?: number | null;
  x?: number | null;
  y?: number | null;
  rotate?: number | null;
};

export type FittedCoverImage = ImageBounds & {
  scale: number;
  cropX: number;
  cropY: number;
};

export const COVER_PHOTO_FIT_MODE = 'slice';
export const MIN_COVER_PHOTO_ZOOM = 1;
export const MAX_COVER_PHOTO_ZOOM = 4;

function assertPositiveDimensions(value: ImageDimensions, label: string) {
  if (
    !Number.isFinite(value.width)
    || !Number.isFinite(value.height)
    || value.width <= 0
    || value.height <= 0
  ) {
    throw new Error(`${label} must have positive finite dimensions.`);
  }
}

function finiteOr(value: number | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCoverPhotoTransform(transform?: CoverPhotoTransform | null) {
  return {
    zoom: clamp(
      finiteOr(transform?.zoom, MIN_COVER_PHOTO_ZOOM),
      MIN_COVER_PHOTO_ZOOM,
      MAX_COVER_PHOTO_ZOOM,
    ),
    x: finiteOr(transform?.x, 0),
    y: finiteOr(transform?.y, 0),
    rotate: finiteOr(transform?.rotate, 0),
  };
}

/**
 * Calculates a cover/slice layout for a source image with known dimensions.
 * The image always fills the slot, preserves its original ratio and only crops
 * the overflow. Horizontal and vertical offsets are clamped so empty borders
 * can never be exposed.
 */
export function fitImageToCover(
  slot: ImageBounds,
  source: ImageDimensions,
  transform?: CoverPhotoTransform | null,
): FittedCoverImage {
  assertPositiveDimensions(slot, 'Image slot');
  assertPositiveDimensions(source, 'Image source');

  const normalized = normalizeCoverPhotoTransform(transform);
  const scale = Math.max(slot.width / source.width, slot.height / source.height)
    * normalized.zoom;
  const width = source.width * scale;
  const height = source.height * scale;
  const maxShiftX = Math.max(0, (width - slot.width) / 2);
  const maxShiftY = Math.max(0, (height - slot.height) / 2);
  const shiftX = clamp(normalized.x, -maxShiftX, maxShiftX);
  const shiftY = clamp(normalized.y, -maxShiftY, maxShiftY);
  const x = slot.x + (slot.width - width) / 2 + shiftX;
  const y = slot.y + (slot.height - height) / 2 + shiftY;

  return {
    x,
    y,
    width,
    height,
    scale,
    cropX: Math.max(0, width - slot.width),
    cropY: Math.max(0, height - slot.height),
  };
}

/**
 * Returns the SVG image viewport used by both clip-layer and legacy pattern
 * covers. Zoom never goes below 1 and offsets are clamped to keep the complete
 * photo area covered.
 */
export function getCoverPhotoViewport(
  bounds: ImageBounds,
  transform?: CoverPhotoTransform | null,
): ImageBounds & { rotate: number } {
  assertPositiveDimensions(bounds, 'Photo bounds');
  const normalized = normalizeCoverPhotoTransform(transform);
  const width = bounds.width * normalized.zoom;
  const height = bounds.height * normalized.zoom;
  const maxShiftX = Math.max(0, (width - bounds.width) / 2);
  const maxShiftY = Math.max(0, (height - bounds.height) / 2);
  const shiftX = clamp(normalized.x, -maxShiftX, maxShiftX);
  const shiftY = clamp(normalized.y, -maxShiftY, maxShiftY);

  return {
    x: bounds.x + (bounds.width - width) / 2 + shiftX,
    y: bounds.y + (bounds.height - height) / 2 + shiftY,
    width,
    height,
    rotate: normalized.rotate,
  };
}

/**
 * SVG's slice mode performs the actual aspect-ratio-aware crop. The alignment
 * follows the selected focus direction, including when zoom is exactly 1.
 */
export function resolveCoverPhotoPreserveAspectRatio(
  transform?: CoverPhotoTransform | null,
): string {
  const normalized = normalizeCoverPhotoTransform(transform);
  const horizontal = normalized.x > 0.001
    ? 'xMin'
    : normalized.x < -0.001
      ? 'xMax'
      : 'xMid';
  const vertical = normalized.y > 0.001
    ? 'YMin'
    : normalized.y < -0.001
      ? 'YMax'
      : 'YMid';

  return `${horizontal}${vertical} ${COVER_PHOTO_FIT_MODE}`;
}
