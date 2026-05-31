export type GradingBand = {
  letter: string;
  minScore: number;
  maxScore: number;
};

export const DEFAULT_GRADING_BANDS: GradingBand[] = [
  { letter: 'A', minScore: 90, maxScore: 100 },
  { letter: 'B', minScore: 80, maxScore: 89 },
  { letter: 'C', minScore: 70, maxScore: 79 },
  { letter: 'D', minScore: 60, maxScore: 69 },
  { letter: 'F', minScore: 0, maxScore: 59 },
];

export function scoreToLetter(
  average: number,
  bands: GradingBand[] = DEFAULT_GRADING_BANDS,
): string {
  const rounded = Math.round(average);
  const band = bands.find(
    (b) => rounded >= b.minScore && rounded <= b.maxScore,
  );
  return band?.letter ?? 'F';
}

export function weightedTermAverage(
  items: { score: number; maxScore: number; weightPercent: number }[],
): number | null {
  if (items.length === 0) return null;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const item of items) {
    const max = item.maxScore > 0 ? item.maxScore : 100;
    const pct = (item.score / max) * 100;
    weightedSum += pct * item.weightPercent;
    totalWeight += item.weightPercent;
  }
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
