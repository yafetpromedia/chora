import { computeCheckoutMetrics } from './staff-hours.util';

describe('computeCheckoutMetrics', () => {
  const expectedOut = new Date('2026-10-07T17:00:00.000Z');
  const checkIn = new Date('2026-10-07T08:00:00.000Z');

  it('computes overtime after expected check-out when OT enabled', () => {
    const checkOut = new Date('2026-10-07T18:30:00.000Z');
    const m = computeCheckoutMetrics(checkIn, checkOut, expectedOut, true);
    expect(m.workedMinutes).toBe(630);
    expect(m.earlyDepartureMinutes).toBe(0);
    expect(m.overtimeMinutes).toBe(90);
  });

  it('zeros overtime when OT disabled', () => {
    const checkOut = new Date('2026-10-07T18:30:00.000Z');
    const m = computeCheckoutMetrics(checkIn, checkOut, expectedOut, false);
    expect(m.overtimeMinutes).toBe(0);
    expect(m.workedMinutes).toBe(630);
  });

  it('computes early departure before expected check-out', () => {
    const checkOut = new Date('2026-10-07T16:00:00.000Z');
    const m = computeCheckoutMetrics(checkIn, checkOut, expectedOut, true);
    expect(m.earlyDepartureMinutes).toBe(60);
    expect(m.overtimeMinutes).toBe(0);
  });
});
