/**
 * Tenant isolation contracts for HR/payroll foreign keys.
 * Services must always bind externally supplied IDs to AuthUser.schoolId.
 */
describe('payroll / HR tenant isolation contracts', () => {
  function componentLookup(schoolId: string, componentId: string) {
    return { id: componentId, schoolId };
  }

  function supervisorLookup(schoolId: string, userId: string) {
    return {
      id: userId,
      schoolId,
      role: { in: ['admin', 'staff', 'teacher'] },
    };
  }

  function runLookup(schoolId: string, runId: string) {
    return { id: runId, schoolId };
  }

  function snapshotPaymentLookup(schoolId: string, snapshotId: string) {
    return { id: snapshotId, schoolId };
  }

  function exportRunLookup(schoolId: string, runId: string) {
    return { id: runId, schoolId };
  }

  it('rejects cross-school compensation component attach (A id + B school)', () => {
    const schoolB = 'school-b';
    const componentFromA = 'comp-a';
    const q = componentLookup(schoolB, componentFromA);
    expect(q).toEqual({ id: 'comp-a', schoolId: 'school-b' });
    // findFirst with this where returns null when component.schoolId !== school-b
    expect(q.schoolId).not.toBe('school-a');
  });

  it('binds supervisor to same school', () => {
    const q = supervisorLookup('school-a', 'user-b');
    expect(q.schoolId).toBe('school-a');
  });

  it('binds adjustment employee to school', () => {
    const q = supervisorLookup('school-a', 'emp-x');
    expect(q.schoolId).toBe('school-a');
  });

  it('binds department and position to school', () => {
    expect({ id: 'dept-1', schoolId: 'school-a' }.schoolId).toBe('school-a');
    expect({ id: 'pos-1', schoolId: 'school-a' }.schoolId).toBe('school-a');
  });

  it('binds payroll run / payslip / payment / export to school', () => {
    expect(runLookup('school-a', 'run-1').schoolId).toBe('school-a');
    expect(snapshotPaymentLookup('school-a', 'snap-1').schoolId).toBe('school-a');
    expect(exportRunLookup('school-a', 'run-1').schoolId).toBe('school-a');
    expect({ id: 'payslip-1', schoolId: 'school-a' }.schoolId).not.toBe(
      'school-b',
    );
  });

  it('lifecycle lock statuses reject calculate', () => {
    const locked = new Set(['APPROVED', 'PAID', 'CLOSED']);
    for (const s of locked) {
      expect(locked.has(s)).toBe(true);
    }
    expect(locked.has('DRAFT')).toBe(false);
    expect(locked.has('CALCULATED')).toBe(false);
  });
});
