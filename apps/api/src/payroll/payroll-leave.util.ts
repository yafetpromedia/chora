/** Calendar helpers for payroll leave / absence — integer day counts only. */

export function toUtcDateKey(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function parseUtcDateKey(key: string): Date {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/** Inclusive calendar keys from start..end (UTC date parts). */
export function eachUtcDateKey(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  if (cur > last) return keys;
  while (cur <= last) {
    keys.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86_400_000);
  }
  return keys;
}

/**
 * Intersection of [leaveStart, leaveEnd] with [periodStart, periodEnd],
 * as UTC calendar date keys (inclusive).
 */
export function leaveDaysInPeriod(
  leaveStart: Date,
  leaveEnd: Date,
  periodStart: Date,
  periodEnd: Date,
): string[] {
  const start = leaveStart > periodStart ? leaveStart : periodStart;
  const end = leaveEnd < periodEnd ? leaveEnd : periodEnd;
  return eachUtcDateKey(start, end);
}

export function unionDateKeys(...sets: Array<Iterable<string>>): Set<string> {
  const out = new Set<string>();
  for (const s of sets) {
    for (const k of s) out.add(k);
  }
  return out;
}

/**
 * Unique deduction calendar days when absence deduction policy is enabled.
 * Overlapping absence + unpaid leave counts once.
 */
export function deductionCalendarDays(params: {
  absenceDateKeys: Iterable<string>;
  unpaidLeaveDateKeys: Iterable<string>;
  deductUnpaidLeave: boolean;
}): Set<string> {
  if (!params.deductUnpaidLeave) {
    return new Set(params.absenceDateKeys);
  }
  return unionDateKeys(params.absenceDateKeys, params.unpaidLeaveDateKeys);
}
