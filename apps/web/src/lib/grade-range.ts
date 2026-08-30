export type GradeSortable = { id: string; name: string; sortOrder: number };

export function sortGrades<T extends GradeSortable>(grades: T[]): T[] {
  return [...grades].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function gradesInRange<T extends GradeSortable>(
  grades: T[],
  fromId: string,
  toId: string,
): T[] {
  const sorted = sortGrades(grades);
  const from = sorted.find((g) => g.id === fromId);
  const to = sorted.find((g) => g.id === toId);
  if (!from || !to) return [];
  const min = Math.min(from.sortOrder, to.sortOrder);
  const max = Math.max(from.sortOrder, to.sortOrder);
  return sorted.filter((g) => g.sortOrder >= min && g.sortOrder <= max);
}

export function formatGradeRangeLabel<T extends GradeSortable>(
  grades: T[],
  fromId: string,
  toId: string,
): string {
  const range = gradesInRange(grades, fromId, toId);
  if (range.length === 0) return "—";
  if (range.length === 1) return range[0].name;
  return `${range[0].name} – ${range[range.length - 1].name}`;
}
