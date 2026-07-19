export type TextBoxOptions = {
  width: number;
  height: number;
  maxFontSize: number;
  minFontSize?: number;
  maxLines?: number;
  lineHeightFactor?: number;
};

export type FittedText = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
};

export type ClientAddressParts = {
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  complement?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
};

export function normalizePdfText(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

function characterWidthFactor(character: string): number {
  if (/\s/.test(character)) return 0.28;
  if (/[MW@%#&]/.test(character)) return 0.82;
  if (/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(character)) return 0.66;
  if (/[ilI1|.,:;'`!]/.test(character)) return 0.28;
  if (/[mw]/.test(character)) return 0.72;
  if (/[0-9]/.test(character)) return 0.56;
  return 0.54;
}

export function estimatePdfTextWidth(value: string, fontSize: number): number {
  return Array.from(value).reduce(
    (total, character) => total + characterWidthFactor(character) * fontSize,
    0,
  );
}

function splitWordToFit(word: string, width: number, fontSize: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const character of Array.from(word)) {
    const candidate = `${current}${character}`;
    if (current && estimatePdfTextWidth(candidate, fontSize) > width) {
      chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function wrapAtFontSize(value: string, width: number, fontSize: number): string[] {
  const words = normalizePdfText(value).split(' ').filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  const pushWord = (word: string) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (!currentLine || estimatePdfTextWidth(candidate, fontSize) <= width) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  };

  words.forEach((word) => {
    if (estimatePdfTextWidth(word, fontSize) <= width) {
      pushWord(word);
      return;
    }

    const chunks = splitWordToFit(word, width, fontSize);
    chunks.forEach((chunk) => pushWord(chunk));
  });

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
}

/**
 * Fits every character inside a bounded PDF text box. The function first wraps
 * at word boundaries and then reduces the font size. Unbroken values are split
 * safely instead of being truncated, so names and addresses remain complete.
 */
export function fitTextWithinBox(value: string, options: TextBoxOptions): FittedText {
  assertPositiveFinite(options.width, 'Text box width');
  assertPositiveFinite(options.height, 'Text box height');
  assertPositiveFinite(options.maxFontSize, 'Maximum font size');

  const normalized = normalizePdfText(value);
  const maxLines = Math.max(1, Math.floor(options.maxLines || 1));
  const minFontSize = Math.min(
    options.maxFontSize,
    Math.max(1.5, options.minFontSize || 5),
  );
  const lineHeightFactor = Math.max(1, options.lineHeightFactor || 1.15);

  if (!normalized) {
    return {
      lines: [''],
      fontSize: options.maxFontSize,
      lineHeight: options.maxFontSize * lineHeightFactor,
      width: 0,
      height: options.maxFontSize * lineHeightFactor,
    };
  }

  const trySize = (fontSize: number): FittedText | null => {
    const lines = wrapAtFontSize(normalized, options.width, fontSize);
    const lineHeight = fontSize * lineHeightFactor;
    const height = lines.length * lineHeight;
    const width = Math.max(...lines.map((line) => estimatePdfTextWidth(line, fontSize)));

    if (lines.length > maxLines || height > options.height + 0.001 || width > options.width + 0.001) {
      return null;
    }

    return { lines, fontSize, lineHeight, width, height };
  };

  for (let fontSize = options.maxFontSize; fontSize >= minFontSize; fontSize -= 0.25) {
    const fitted = trySize(Number(fontSize.toFixed(2)));
    if (fitted) return fitted;
  }

  // Exceptional values may require a smaller size, but are still preserved in
  // full. This is preferable to clipping or silently adding an ellipsis.
  for (let fontSize = minFontSize - 0.25; fontSize >= 1.5; fontSize -= 0.25) {
    const fitted = trySize(Number(fontSize.toFixed(2)));
    if (fitted) return fitted;
  }

  throw new Error('Text cannot fit inside the configured box without truncation.');
}

export function formatClientAddress(parts: ClientAddressParts | null | undefined): string {
  if (!parts) return '';

  const street = normalizePdfText(parts.address);
  const number = normalizePdfText(parts.number);
  const neighborhood = normalizePdfText(parts.neighborhood);
  const complement = normalizePdfText(parts.complement);
  const city = normalizePdfText(parts.city);
  const state = normalizePdfText(parts.state);
  const cep = normalizePdfText(parts.cep);

  const streetLine = [street, number].filter(Boolean).join(', ');
  const cityState = [city, state].filter(Boolean).join(' - ');

  return [
    streetLine,
    complement,
    neighborhood,
    cityState,
    cep ? `CEP ${cep}` : '',
  ].filter(Boolean).join(' • ');
}
