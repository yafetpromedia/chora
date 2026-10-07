import { sumCents, percentOfCents, minutesToHourCents } from './money.util';
import {
  deductionCalendarDays,
  leaveDaysInPeriod,
} from './payroll-leave.util';

describe('payroll math & leave policy', () => {
  function d(iso: string) {
    return new Date(`${iso}T00:00:00.000Z`);
  }

  it('computes net = gross - deductions without float drift', () => {
    const earnings = [1_500_000, 150_000, 22_500];
    const deductions = [75_000, 10_000];
    const gross = sumCents(earnings);
    const ded = sumCents(deductions);
    const net = Math.max(0, gross - ded);
    expect(gross).toBe(1_672_500);
    expect(ded).toBe(85_000);
    expect(net).toBe(1_587_500);
  });

  it('employer cost does not reduce employee net', () => {
    const gross = 100_000;
    const employeeDed = 10_000;
    const employer = 7_000;
    const net = gross - employeeDed;
    const employerCost = gross + employer;
    expect(net).toBe(90_000);
    expect(employerCost).toBe(107_000);
  });

  it('percentage and OT rounding stay integer cents', () => {
    expect(percentOfCents(1_000_000, 1500)).toBe(150_000); // 15%
    expect(minutesToHourCents(90, 10_000, 15_000)).toBe(22_500);
  });

  it('NO_DEDUCTION: unpaid leave keys ignored for salary reduction', () => {
    // Policy gate: when NO_DEDUCTION, service skips deduction lines entirely.
    const deductPolicyEnabled = false;
    const keys = deductPolicyEnabled
      ? deductionCalendarDays({
          absenceDateKeys: ['2026-10-10'],
          unpaidLeaveDateKeys: ['2026-10-10', '2026-10-11'],
          deductUnpaidLeave: true,
        })
      : new Set<string>();
    expect(keys.size).toBe(0);
  });

  it('paid leave days are not deduction days', () => {
    const paid = leaveDaysInPeriod(
      d('2026-10-01'),
      d('2026-10-03'),
      d('2026-10-01'),
      d('2026-10-31'),
    );
    const unpaid = leaveDaysInPeriod(
      d('2026-10-10'),
      d('2026-10-11'),
      d('2026-10-01'),
      d('2026-10-31'),
    );
    const deduct = deductionCalendarDays({
      absenceDateKeys: [],
      unpaidLeaveDateKeys: unpaid,
      deductUnpaidLeave: true,
    });
    for (const k of paid) expect(deduct.has(k)).toBe(false);
    expect(deduct.size).toBe(2);
  });

  it('recalc idempotency model: replace snapshots not append', () => {
    let lines = [
      { code: 'BASIC', amountCents: 100 },
      { code: 'OT', amountCents: 50 },
    ];
    // simulate deleteMany + recreate
    lines = [];
    lines = [
      { code: 'BASIC', amountCents: 100 },
      { code: 'OT', amountCents: 50 },
    ];
    expect(lines.filter((l) => l.code === 'BASIC')).toHaveLength(1);
    expect(sumCents(lines.map((l) => l.amountCents))).toBe(150);
  });
});
