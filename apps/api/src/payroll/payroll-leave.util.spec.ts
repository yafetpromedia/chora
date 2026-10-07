import {
  deductionCalendarDays,
  eachUtcDateKey,
  leaveDaysInPeriod,
  toUtcDateKey,
} from './payroll-leave.util';

function d(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe('payroll-leave.util', () => {
  it('enumerates inclusive UTC dates', () => {
    expect(eachUtcDateKey(d('2026-10-01'), d('2026-10-03'))).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('intersects leave fully inside period', () => {
    const keys = leaveDaysInPeriod(
      d('2026-10-10'),
      d('2026-10-12'),
      d('2026-10-01'),
      d('2026-10-31'),
    );
    expect(keys).toEqual(['2026-10-10', '2026-10-11', '2026-10-12']);
  });

  it('intersects leave starting before period', () => {
    const keys = leaveDaysInPeriod(
      d('2026-09-28'),
      d('2026-10-05'),
      d('2026-10-01'),
      d('2026-10-31'),
    );
    expect(keys[0]).toBe('2026-10-01');
    expect(keys[keys.length - 1]).toBe('2026-10-05');
    expect(keys).toHaveLength(5);
  });

  it('intersects leave ending after period', () => {
    const keys = leaveDaysInPeriod(
      d('2026-10-28'),
      d('2026-11-05'),
      d('2026-10-01'),
      d('2026-10-31'),
    );
    expect(keys).toEqual([
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
    ]);
  });

  it('returns empty when leave outside period', () => {
    expect(
      leaveDaysInPeriod(
        d('2026-09-01'),
        d('2026-09-10'),
        d('2026-10-01'),
        d('2026-10-31'),
      ),
    ).toEqual([]);
  });

  it('unions absence + unpaid leave without double-counting', () => {
    const days = deductionCalendarDays({
      absenceDateKeys: ['2026-10-10', '2026-10-11'],
      unpaidLeaveDateKeys: ['2026-10-10', '2026-10-11', '2026-10-12'],
      deductUnpaidLeave: true,
    });
    expect([...days].sort()).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
    ]);
  });

  it('NO_DEDUCTION / unpaid off: only absence keys when unpaid disabled', () => {
    const days = deductionCalendarDays({
      absenceDateKeys: ['2026-10-10'],
      unpaidLeaveDateKeys: ['2026-10-10', '2026-10-11'],
      deductUnpaidLeave: false,
    });
    expect([...days]).toEqual(['2026-10-10']);
  });

  it('toUtcDateKey normalizes', () => {
    expect(toUtcDateKey(d('2026-10-07'))).toBe('2026-10-07');
  });
});
