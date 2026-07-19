export type PdfQualityMetrics = {
  byteLength: number;
  pageCount: number;
  objectCount: number;
  streamCount: number;
  fontCount: number;
  imageCount: number;
  hasPdfHeader: boolean;
  hasEofMarker: boolean;
  mimeType: string;
};

export type PdfQualityRequirements = {
  minByteLength?: number;
  minPages?: number;
};

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length || 0;
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function inspectPdfBlob(blob: Blob): Promise<PdfQualityMetrics> {
  assertCondition(blob instanceof Blob, 'O gerador não retornou um arquivo Blob.');

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const source = new TextDecoder('latin1').decode(bytes);
  const eofIndex = source.lastIndexOf('%%EOF');

  return {
    byteLength: bytes.byteLength,
    pageCount: countMatches(source, /\/Type\s*\/Page\b/g),
    objectCount: countMatches(source, /\b\d+\s+\d+\s+obj\b/g),
    streamCount: countMatches(source, /\bstream(?:\r\n|\n|\r)/g),
    fontCount: countMatches(source, /\/Type\s*\/Font\b/g),
    imageCount: countMatches(source, /\/Subtype\s*\/Image\b/g),
    hasPdfHeader: /^%PDF-\d\.\d/.test(source.slice(0, 16)),
    hasEofMarker: eofIndex >= 0 && source.length - eofIndex <= 128,
    mimeType: blob.type,
  };
}

export function assertPdfQuality(
  metrics: PdfQualityMetrics,
  requirements: PdfQualityRequirements = {},
) {
  const minByteLength = requirements.minByteLength ?? 512;
  const minPages = requirements.minPages ?? 1;

  assertCondition(metrics.hasPdfHeader, 'O arquivo gerado não possui cabeçalho PDF válido.');
  assertCondition(metrics.hasEofMarker, 'O arquivo gerado não possui marcador de encerramento PDF.');
  assertCondition(
    !metrics.mimeType || metrics.mimeType === 'application/pdf',
    `O arquivo gerado possui MIME type inválido: ${metrics.mimeType || 'vazio'}.`,
  );
  assertCondition(
    metrics.byteLength >= minByteLength,
    `O PDF gerado possui apenas ${metrics.byteLength} bytes; mínimo esperado: ${minByteLength}.`,
  );
  assertCondition(
    metrics.pageCount >= minPages,
    `O PDF gerado possui ${metrics.pageCount} página(s); mínimo esperado: ${minPages}.`,
  );
  assertCondition(
    metrics.objectCount >= metrics.pageCount,
    'O PDF gerado não contém objetos suficientes para representar suas páginas.',
  );
  assertCondition(
    metrics.streamCount >= metrics.pageCount,
    'O PDF gerado perdeu streams de conteúdo necessários para suas páginas.',
  );
}

export async function validatePdfBlob(
  blob: Blob,
  requirements: PdfQualityRequirements = {},
): Promise<PdfQualityMetrics> {
  const metrics = await inspectPdfBlob(blob);
  assertPdfQuality(metrics, requirements);
  return metrics;
}

export function assertRepeatedPdfQuality(
  reference: PdfQualityMetrics,
  current: PdfQualityMetrics,
  maxSizeDriftRatio = 0.05,
) {
  assertCondition(
    maxSizeDriftRatio >= 0 && maxSizeDriftRatio <= 1,
    'A tolerância de tamanho do PDF é inválida.',
  );

  const comparableFields: Array<keyof Pick<
    PdfQualityMetrics,
    'pageCount' | 'objectCount' | 'streamCount' | 'fontCount' | 'imageCount'
  >> = ['pageCount', 'objectCount', 'streamCount', 'fontCount', 'imageCount'];

  for (const field of comparableFields) {
    assertCondition(
      current[field] === reference[field],
      `A geração repetida alterou ${field}: ${reference[field]} -> ${current[field]}.`,
    );
  }

  const sizeDrift = reference.byteLength > 0
    ? Math.abs(current.byteLength - reference.byteLength) / reference.byteLength
    : 0;

  assertCondition(
    sizeDrift <= maxSizeDriftRatio,
    `A geração repetida variou ${(sizeDrift * 100).toFixed(2)}% em tamanho; limite: ${(maxSizeDriftRatio * 100).toFixed(2)}%.`,
  );
}
