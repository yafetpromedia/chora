import {
  canHomeroomReviewSection,
  computeAbsentDifference,
  isSameSchoolTenant,
} from './attendance-concerns.util';

describe('attendance-concerns.util', () => {
  describe('computeAbsentDifference', () => {
    it('returns +1 when observed absent exceeds official', () => {
      expect(computeAbsentDifference(4, 5, true)).toBe(1);
    });

    it('returns null when official attendance not submitted', () => {
      expect(computeAbsentDifference(4, 5, false)).toBeNull();
    });

    it('does not invent a difference without observed count', () => {
      expect(computeAbsentDifference(4, null, true)).toBeNull();
    });
  });

  describe('isSameSchoolTenant', () => {
    it('accepts matching school ids', () => {
      expect(isSameSchoolTenant(['school-a', 'school-a', 'school-a'])).toBe(
        true,
      );
    });

    it('rejects mixed school ids', () => {
      expect(isSameSchoolTenant(['school-a', 'school-b'])).toBe(false);
    });
  });

  describe('canHomeroomReviewSection', () => {
    it('allows matching homeroom grade/section', () => {
      expect(
        canHomeroomReviewSection({
          homeroomGradeId: 'g1',
          homeroomSectionId: 's1',
          concernGradeId: 'g1',
          concernSectionId: 's1',
        }),
      ).toBe(true);
    });

    it('blocks other sections', () => {
      expect(
        canHomeroomReviewSection({
          homeroomGradeId: 'g1',
          homeroomSectionId: 's1',
          concernGradeId: 'g1',
          concernSectionId: 's2',
        }),
      ).toBe(false);
    });

    it('blocks teachers without homeroom', () => {
      expect(
        canHomeroomReviewSection({
          homeroomGradeId: null,
          homeroomSectionId: null,
          concernGradeId: 'g1',
          concernSectionId: 's1',
        }),
      ).toBe(false);
    });
  });
});
