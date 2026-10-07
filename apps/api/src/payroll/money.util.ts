/** Integer-cent money helpers — never use floating point for stored payroll. */

export function percentOfCents(amountCents: number, basisPoints: number): number {
  // basisPoints: 10000 = 100%
  return Math.round((amountCents * basisPoints) / 10_000);
}

export function sumCents(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function minutesToHourCents(
  minutes: number,
  hourlyRateCents: number,
  multiplierBp = 10_000,
): number {
  if (minutes <= 0 || hourlyRateCents <= 0) return 0;
  const rate = percentOfCents(hourlyRateCents, multiplierBp);
  return Math.round((minutes * rate) / 60);
}

export function dailyFromMonthly(basicCents: number, workingDays: number): number {
  if (workingDays <= 0) return 0;
  return Math.round(basicCents / workingDays);
}
