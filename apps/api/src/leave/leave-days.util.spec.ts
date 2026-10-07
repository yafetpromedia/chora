import { countWeekdays } from './leave.service';

describe('countWeekdays', () => {
  it('counts Mon–Fri inclusive and skips weekends', () => {
    // Fri 2026-10-09 → Mon 2026-10-12 = Fri + Mon = 2
    const start = new Date(Date.UTC(2026, 9, 9));
    const end = new Date(Date.UTC(2026, 9, 12));
    expect(countWeekdays(start, end)).toBe(2);
  });

  it('counts a full work week as 5', () => {
    const start = new Date(Date.UTC(2026, 9, 5)); // Mon
    const end = new Date(Date.UTC(2026, 9, 9)); // Fri
    expect(countWeekdays(start, end)).toBe(5);
  });

  it('returns 0 when end is before start', () => {
    const start = new Date(Date.UTC(2026, 9, 10));
    const end = new Date(Date.UTC(2026, 9, 8));
    expect(countWeekdays(start, end)).toBe(0);
  });
});
