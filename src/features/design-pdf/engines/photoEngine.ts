import { TransformConfig } from '../types/pdfDesignTypes';
import { Bounds, SVG_NS, clearElement, getUrlReference, parseBounds, setHref } from './svgDom';
import {
  getCoverPhotoViewport,
  resolveCoverPhotoPreserveAspectRatio,
} from './imageLayout';

const PHOTO_PLACEHOLDER_SELECTOR = [
  '[id*="foto_aqui_placeholder"]',
  '[id*="foto_aqui_icon"]',
  '[id*="foto aqui_icon"]',
  '[id*="Foto_aqui_icon"]',
  '[id*="photo_icon"]',
  '[id*="image_icon"]',
].join(', ');

const PHOTO_MASK_SHAPE_SELECTOR = [
  'path',
  'rect',
  'polygon',
  'polyline',
  'circle',
  'ellipse',
].join(', ');

function getImageTransform(bounds: Bounds, transform?: TransformConfig) {
  const viewport = getCoverPhotoViewport(bounds, transform);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x: viewport.x,
    y: viewport.y,
    width: viewport.width,
    height: viewport.height,
    transform: viewport.rotate
      ? `rotate(${viewport.rotate} ${centerX} ${centerY})`
      : '',
  };
}

function hidePhotoPlaceholder(doc: Document) {
  doc.querySelectorAll(PHOTO_PLACEHOLDER_SELECTOR).forEach((element) => {
    element.setAttribute('display', 'none');
    element.setAttribute('opacity', '0');
  });
}

function moveLayerAbovePlaceholder(layer: Element) {
  const parent = layer.parentElement;
  if (!parent) return;
  if (parent.lastElementChild !== layer) parent.appendChild(layer);
}

function readMaskBounds(mask: Element): Bounds | null {
  const x = Number(mask.getAttribute('x'));
  const y = Number(mask.getAttribute('y'));
  const width = Number(mask.getAttribute('width'));
  const height = Number(mask.getAttribute('height'));

  if (
    [x, y, width, height].every(Number.isFinite)
    && width > 0
    && height > 0
  ) {
    return { x, y, width, height };
  }

  return null;
}

function findLegacyMaskedPhotoSlot(doc: Document) {
  const placeholders = Array.from(
    doc.querySelectorAll(PHOTO_PLACEHOLDER_SELECTOR),
  );

  for (const placeholder of placeholders) {
    const host = placeholder.closest('g[mask]');
    if (!host) continue;

    const maskId = getUrlReference(host.getAttribute('mask'));
    const mask = maskId ? doc.getElementById(maskId) : null;
    const sourceShape = mask?.querySelector(PHOTO_MASK_SHAPE_SELECTOR) || null;

    if (mask && sourceShape) {
      return {
        host,
        mask,
        sourceShape,
      };
    }
  }

  return null;
}

/**
 * Templates atuais já possuem `cover-photo` e `cover-photo-layer`.
 * Alguns SVGs antigos possuem o mesmo slot visual dentro de um grupo com máscara.
 *
 * Em vez de manter regras por nome de capa, este adaptador promove qualquer slot
 * mascarado legado para o contrato padrão. Depois da promoção, todos os modelos
 * passam exatamente por `applyPhotoAsClipLayer`, com o mesmo cover, zoom, foco,
 * posição e rotação.
 */
function upgradeMaskedPhotoSlotToStandardContract(doc: Document) {
  if (doc.getElementById('cover-photo-layer')) return false;

  const legacySlot = findLegacyMaskedPhotoSlot(doc);
  if (!legacySlot) return false;

  const { host, mask, sourceShape } = legacySlot;
  const bounds = readMaskBounds(mask)
    || { x: 0, y: 0, width: 595, height: 842 };

  // A máscara antiga podia usar a imagem somente para calcular alfa.
  // Torná-la branca converte a geometria em uma máscara opaca estável.
  sourceShape.setAttribute('fill', '#FFFFFF');
  sourceShape.setAttribute('fill-opacity', '1');
  sourceShape.setAttribute('opacity', '1');
  sourceShape.removeAttribute('filter');
  sourceShape.setAttribute('data-pdf-role', 'cover-photo-mask-shape');

  const originalId = host.getAttribute('id');
  if (originalId && originalId !== 'cover-photo') {
    host.setAttribute('data-original-photo-host-id', originalId);
  }

  host.setAttribute('id', 'cover-photo');
  host.setAttribute('data-photo-mask', 'true');
  host.setAttribute(
    'data-photo-bounds',
    `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
  );
  host.setAttribute('data-photo-layout', 'standard-mask-slot');

  const layer = doc.createElementNS(SVG_NS, 'g');
  layer.setAttribute('id', 'cover-photo-layer');
  layer.setAttribute('data-dynamic-photo-layer', 'true');
  host.insertBefore(layer, host.firstChild);

  return true;
}

function applyPhotoAsClipLayer(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return false;
  const layer = doc.getElementById('cover-photo-layer');
  if (!layer) return false;

  const coverGroup = doc.getElementById('cover-photo') || layer.parentElement;
  const bounds = parseBounds(coverGroup?.getAttribute('data-photo-bounds') || null)
    || { x: 0, y: 0, width: 595, height: 842 };
  const crop = getImageTransform(bounds, transform);

  hidePhotoPlaceholder(doc);
  moveLayerAbovePlaceholder(layer);
  clearElement(layer);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'clip-layer');
  image.setAttribute('data-pdf-image-fit', 'cover');
  image.setAttribute('x', String(crop.x));
  image.setAttribute('y', String(crop.y));
  image.setAttribute('width', String(crop.width));
  image.setAttribute('height', String(crop.height));
  image.setAttribute(
    'preserveAspectRatio',
    resolveCoverPhotoPreserveAspectRatio(transform),
  );
  image.setAttribute('display', 'block');
  image.setAttribute('opacity', '1');
  image.setAttribute('crossorigin', 'anonymous');
  if (crop.transform) image.setAttribute('transform', crop.transform);
  setHref(image, imageUrl);

  layer.appendChild(image);
  coverGroup?.setAttribute('data-photo-applied', 'true');
  return true;
}

function findLegacyPhotoShape(doc: Document) {
  const byId = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('foto_aqui') || id.includes('foto aqui') || id.includes('cover-photo');
  });

  const shape = byId?.matches('path, rect, polygon, polyline, circle, ellipse')
    ? byId
    : byId?.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');

  return shape || doc.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');
}

function applyPhotoAsPattern(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return;

  const shape = findLegacyPhotoShape(doc);
  const patternId = getUrlReference(shape?.getAttribute('fill') || null);
  const pattern = patternId ? doc.getElementById(patternId) : null;
  if (!shape || !pattern) return;

  clearElement(pattern);
  pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
  pattern.setAttribute('width', '1');
  pattern.setAttribute('height', '1');
  pattern.removeAttribute('patternTransform');

  const patternTransform = {
    zoom: transform?.zoom,
    x: Number(transform?.x ?? 0) / 595,
    y: Number(transform?.y ?? 0) / 842,
    rotate: transform?.rotate,
  };
  const crop = getCoverPhotoViewport(
    { x: 0, y: 0, width: 1, height: 1 },
    patternTransform,
  );

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'crop');
  image.setAttribute('data-pdf-image-fit', 'cover');
  image.setAttribute('x', String(crop.x));
  image.setAttribute('y', String(crop.y));
  image.setAttribute('width', String(crop.width));
  image.setAttribute('height', String(crop.height));
  image.setAttribute(
    'preserveAspectRatio',
    resolveCoverPhotoPreserveAspectRatio(transform),
  );
  image.setAttribute('display', 'block');
  image.setAttribute('opacity', '1');
  image.setAttribute('crossorigin', 'anonymous');
  if (crop.rotate) image.setAttribute('transform', `rotate(${crop.rotate} 0.5 0.5)`);
  setHref(image, imageUrl);

  pattern.appendChild(image);
  shape.setAttribute('id', 'cover-photo-shape');
  shape.setAttribute('data-pdf-role', 'cover-photo-shape');
  hidePhotoPlaceholder(doc);
}

export function applyCoverPhoto(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  upgradeMaskedPhotoSlotToStandardContract(doc);
  const photoApplied = applyPhotoAsClipLayer(doc, imageUrl, transform);
  if (!photoApplied) applyPhotoAsPattern(doc, imageUrl, transform);
}
