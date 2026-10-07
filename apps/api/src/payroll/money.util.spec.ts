import {
  dailyFromMonthly,
  minutesToHourCents,
  percentOfCents,
  sumCents,
} from './money.util';

describe('payroll money.util', () => {
  it('computes percentage of basic in cents', () => {
    expect(percentOfCents(100_000, 1000)).toBe(10_000); // 10%
    expect(percentOfCents(1_500_000, 1500)).toBe(225_000); // 15% of 15000.00
  });

  it('sums cents without float drift', () => {
    expect(sumCents([100, 200, 300])).toBe(600);
  });

  it('converts overtime minutes with multiplier', () => {
    // 90 min at 100 ETB/hr (10000 cents) × 1.5 = 22500 cents
    expect(minutesToHourCents(90, 10_000, 15_000)).toBe(22_500);
  });

  it('derives daily rate from monthly', () => {
    expect(dailyFromMonthly(22_000_00, 22)).toBe(100_000);
  });
});
