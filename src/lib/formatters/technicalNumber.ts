const detailedNumber = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});

const largeNumber = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const truncatedFormatters = new Map<number, Intl.NumberFormat>();

const getTruncatedFormatter = (maximumFractionDigits: number) => {
  const cached = truncatedFormatters.get(maximumFractionDigits);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits });
  truncatedFormatters.set(maximumFractionDigits, formatter);
  return formatter;
};

export const technicalNumber = {
  format(value: number) {
    if (!Number.isFinite(value)) return '—';
    return (Math.abs(value) >= 1000 ? largeNumber : detailedNumber).format(value);
  },
  formatTruncated(value: number, maximumFractionDigits = 2) {
    if (!Number.isFinite(value)) return '—';

    const digits = Math.min(6, Math.max(0, Math.trunc(maximumFractionDigits)));
    const factor = 10 ** digits;
    const epsilon = Math.sign(value || 1) * Number.EPSILON * Math.max(1, Math.abs(value));
    const truncated = Math.trunc((value + epsilon) * factor) / factor;

    return getTruncatedFormatter(digits).format(truncated);
  },
};
