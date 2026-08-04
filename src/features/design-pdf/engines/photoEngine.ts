import { TransformConfig } from '../types/pdfDesignTypes';
import { Bounds, SVG_NS, clearElement, getUrlReference, parseBounds, setHref } from './svgDom';
import {
  getCoverPhotoViewport,
  resolveCoverPhotoPreserveAspectRatio,
} from './imageLayout';

const PRISMA_SOLAR_COVER_SELECTOR = '[id="A4 - 12"], [id="capa_12"]';
const PRISMA_SOLAR_MASK_ID = 'mask0_326_18';
const PRISMA_SOLAR_VISIBLE_SHAPE_ID = 'cover-photo-shape-prisma-solar';

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
  doc.querySelectorAll('[id*="foto_aqui_placeholder"], [id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"], [id*="photo_icon"], [id*="image_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
    element.setAttribute('opacity', '0');
  });
}

function moveLayerAbovePlaceholder(layer: Element) {
  const parent = layer.parentElement;
  if (!parent) return;
  if (parent.lastElementChild !== layer) parent.appendChild(layer);
}

/**
 * A A4 12 usa o pattern da foto apenas para controlar o alfa de uma máscara.
 * Alterar esse pattern não cria uma superfície visível, portanto o placeholder
 * desaparecia e o fundo cinza continuava aparecendo como um espaço branco.
 *
 * Para essa capa, clonamos a geometria prismática da máscara como um path visível
 * no final da arte. O fluxo legado então preenche esse path com o mesmo pattern
 * usado pelas capas que já funcionam, sem depender da rasterização de clipPath.
 */
function ensurePrismaSolarVisiblePhotoShape(doc: Document) {
  if (!doc.querySelector(PRISMA_SOLAR_COVER_SELECTOR)) return;
  if (doc.getElementById(PRISMA_SOLAR_VISIBLE_SHAPE_ID)) return;
  if (doc.querySelector('[data-prisma-solar-photo-shape="true"]')) return;

  const mask = doc.getElementById(PRISMA_SOLAR_MASK_ID);
  const sourceShape = mask?.querySelector('path[fill^="url(#"]');
  const patternReference = sourceShape?.getAttribute('fill');
  const placeholder = doc.getElementById('foto_aqui_icon');
  const placeholderHost = placeholder?.closest('g[mask]');
  const parent = placeholderHost?.parentElement || doc.getElementById('capa_12');

  if (!sourceShape || !patternReference || !parent) return;

  const visibleShape = sourceShape.cloneNode(false) as Element;
  visibleShape.setAttribute('id', PRISMA_SOLAR_VISIBLE_SHAPE_ID);
  visibleShape.setAttribute('fill', patternReference);
  visibleShape.setAttribute('display', 'block');
  visibleShape.setAttribute('opacity', '1');
  visibleShape.setAttribute('pointer-events', 'none');
  visibleShape.setAttribute('data-pdf-role', 'cover-photo-shape');
  visibleShape.setAttribute('data-photo-layout', 'prisma-solar-visible-pattern');
  visibleShape.setAttribute('data-prisma-solar-photo-shape', 'true');
  visibleShape.removeAttribute('mask');
  visibleShape.removeAttribute('style');

  parent.insertBefore(visibleShape, placeholderHost || null);
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
  ensurePrismaSolarVisiblePhotoShape(doc);
  const photoApplied = applyPhotoAsClipLayer(doc, imageUrl, transform);
  if (!photoApplied) applyPhotoAsPattern(doc, imageUrl, transform);
}
