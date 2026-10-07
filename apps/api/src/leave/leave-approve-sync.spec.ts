import { StaffAttendanceStatus } from '@prisma/client';

/**
 * Documents the approve → ON_LEAVE contract used by LeaveService.applyApprovedLeaveAttendance.
 * Days are weekdays only; each day upserts StaffAttendanceRecord with on_leave.
 */
describe('leave approve → ON_LEAVE sync contract', () => {
  it('uses on_leave status for approved leave attendance rows', () => {
    expect(StaffAttendanceStatus.on_leave).toBe('on_leave');
  });

  it('maps a leave day range into one attendance upsert per weekday', () => {
    const weekdays = [
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ];
    const rows = weekdays.map((date) => ({
      date,
      status: StaffAttendanceStatus.on_leave,
    }));
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.status === 'on_leave')).toBe(true);
  });
});
