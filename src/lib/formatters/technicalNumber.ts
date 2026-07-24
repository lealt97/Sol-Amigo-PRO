const detailedNumber = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});

const largeNumber = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

export const technicalNumber = {
  format(value: number) {
    if (!Number.isFinite(value)) return '—';
    return (Math.abs(value) >= 1000 ? largeNumber : detailedNumber).format(value);
  },
};
