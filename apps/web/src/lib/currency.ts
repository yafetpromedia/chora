export function formatEtbNumber(
  value: number,
  options?: { maximumFractionDigits?: number },
): string {
  return value.toLocaleString("en-ET", {
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
}

/** Plain string for toasts, exports, and other non-React contexts. */
export function formatEtbPlain(
  cents: number,
  options?: { maximumFractionDigits?: number },
): string {
  return `${formatEtbNumber(cents / 100, options)} ETB`;
}

export function formatEtbWhole(amount: number): string {
  return formatEtbNumber(amount, { maximumFractionDigits: 0 });
}
