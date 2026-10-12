/**
 * Pure helpers for attendance concerns (official fact vs observation).
 */

export function computeAbsentDifference(
  officialAbsent: number | null | undefined,
  observedAbsent: number | null | undefined,
  officialSubmitted: boolean,
): number | null {
  if (observedAbsent == null) return null;
  if (!officialSubmitted || officialAbsent == null) return null;
  return observedAbsent - officialAbsent;
}

export function isSameSchoolTenant(parts: Array<string | null | undefined>) {
  const ids = parts.filter((p): p is string => !!p);
  if (ids.length === 0) return true;
  return ids.every((id) => id === ids[0]);
}

export function canHomeroomReviewSection(args: {
  homeroomGradeId: string | null | undefined;
  homeroomSectionId: string | null | undefined;
  concernGradeId: string;
  concernSectionId: string | null | undefined;
}): boolean {
  if (!args.homeroomGradeId || args.homeroomGradeId !== args.concernGradeId) {
    return false;
  }
  if (
    args.homeroomSectionId &&
    args.concernSectionId &&
    args.homeroomSectionId !== args.concernSectionId
  ) {
    return false;
  }
  return true;
}
