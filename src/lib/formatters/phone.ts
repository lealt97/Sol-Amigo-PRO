export function formatBrazilianPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (!digits) return '';
  if (digits.length === 1) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (!subscriber) return `(${areaCode}) `;

  if (subscriber.length <= 4) {
    return `(${areaCode}) ${subscriber}`;
  }

  const prefixLength = digits.length === 11 ? 5 : 4;
  const prefix = subscriber.slice(0, prefixLength);
  const suffix = subscriber.slice(prefixLength);

  return suffix
    ? `(${areaCode}) ${prefix}-${suffix}`
    : `(${areaCode}) ${prefix}`;
}
