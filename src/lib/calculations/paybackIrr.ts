export function calculatePeriodicIrr(cashFlows: number[]) {
  const npvAt = (rate: number) => cashFlows.reduce(
    (total, cashFlow, period) => total + cashFlow / ((1 + rate) ** period),
    0,
  );

  const candidateRates = [
    -0.9, -0.5, -0.25, -0.1, -0.05, -0.01,
    0, 0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10,
  ];
  let previousRate: number | null = null;
  let previousValue: number | null = null;
  let lower: number | null = null;
  let upper: number | null = null;

  for (const rate of candidateRates) {
    const value = npvAt(rate);
    if (!Number.isFinite(value)) continue;
    if (Math.abs(value) < 0.000001) return rate;
    if (previousRate != null && previousValue != null && previousValue * value < 0) {
      lower = previousRate;
      upper = rate;
      break;
    }
    previousRate = rate;
    previousValue = value;
  }

  if (lower == null || upper == null) return null;
  let lowerBound: number = lower;
  let upperBound: number = upper;
  let lowerValue = npvAt(lowerBound);

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const midpoint = (lowerBound + upperBound) / 2;
    const midpointValue = npvAt(midpoint);
    if (!Number.isFinite(midpointValue)) return null;
    if (Math.abs(midpointValue) < 0.000001) return midpoint;

    if (lowerValue * midpointValue <= 0) {
      upperBound = midpoint;
    } else {
      lowerBound = midpoint;
      lowerValue = midpointValue;
    }
  }

  return (lowerBound + upperBound) / 2;
}
