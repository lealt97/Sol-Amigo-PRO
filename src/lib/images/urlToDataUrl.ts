const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function normalizeImageMimeType(value: string | null | undefined) {
  const normalized = value?.split(';')[0]?.trim().toLowerCase() || '';
  if (normalized === 'image/jpg') return 'image/jpeg';
  return IMAGE_MIME_TYPES.has(normalized) ? normalized : null;
}

function detectImageMimeType(bytes: Uint8Array) {
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result?.startsWith('data:image/')) {
        reject(new Error('asset_data_url_invalid_image'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error || new Error('asset_data_url_read_failed'));
    reader.readAsDataURL(blob);
  });
}

export async function blobToImageDataUrl(blob: Blob): Promise<string> {
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const mimeType = normalizeImageMimeType(blob.type) || detectImageMimeType(header);

  if (!mimeType) {
    throw new Error('asset_unsupported_image_type');
  }

  const typedBlob = normalizeImageMimeType(blob.type) === mimeType
    ? blob
    : new Blob([await blob.arrayBuffer()], { type: mimeType });

  return readBlobAsDataUrl(typedBlob);
}

export async function urlToDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('data:')) throw new Error('asset_data_url_invalid_image');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`asset_http_${response.status}`);
  }

  return blobToImageDataUrl(await response.blob());
}
