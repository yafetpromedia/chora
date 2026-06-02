import { scoreToLetter, weightedTermAverage } from './grading.util';

describe('grading.util', () => {
  describe('scoreToLetter', () => {
    it('maps rounded averages to grade bands', () => {
      expect(scoreToLetter(89.6)).toBe('A');
      expect(scoreToLetter(79.4)).toBe('C');
      expect(scoreToLetter(59.4)).toBe('F');
    });
  });

  describe('weightedTermAverage', () => {
    it('returns null for empty assessments', () => {
      expect(weightedTermAverage([])).toBeNull();
    });

    it('computes weighted percent from varying max scores', () => {
      const average = weightedTermAverage([
        { score: 12, maxScore: 15, weightPercent: 20 },
        { score: 18, maxScore: 20, weightPercent: 30 },
        { score: 40, maxScore: 50, weightPercent: 50 },
      ]);

      expect(average).toBe(83);
    });
  });
});
