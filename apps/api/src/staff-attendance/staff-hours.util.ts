/** Pure checkout metrics used by staff attendance (UTC wall-clock dates). */
export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export function computeCheckoutMetrics(
  checkInAt: Date | null | undefined,
  checkOutAt: Date,
  expectedCheckOut: Date,
  overtimeEnabled = true,
): {
  workedMinutes: number | null;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
} {
  const workedMinutes = checkInAt
    ? minutesBetween(checkInAt, checkOutAt)
    : null;
  const earlyDepartureMinutes =
    checkOutAt.getTime() < expectedCheckOut.getTime()
      ? minutesBetween(checkOutAt, expectedCheckOut)
      : 0;
  // Future: subtract breakMinutes when break clocking is added.
  const overtimeMinutes =
    overtimeEnabled && checkOutAt.getTime() > expectedCheckOut.getTime()
      ? minutesBetween(expectedCheckOut, checkOutAt)
      : 0;
  return { workedMinutes, earlyDepartureMinutes, overtimeMinutes };
}
