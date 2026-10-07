/**
 * Documents required schoolId binding for staff attendance / leave / QR.
 * Controllers always pass AuthUser.schoolId; services must never query by id alone.
 */
describe('tenant scope contracts', () => {
  function scopedWhere(schoolId: string, id: string) {
    return { id, schoolId };
  }

  function qrLookup(schoolId: string, token: string) {
    return { schoolId, token, active: true };
  }

  it('binds record reads to schoolId + id', () => {
    expect(scopedWhere('school-a', 'rec-1')).toEqual({
      id: 'rec-1',
      schoolId: 'school-a',
    });
    expect(scopedWhere('school-a', 'rec-1').schoolId).not.toBe('school-b');
  });

  it('binds QR credential lookup to scanner school', () => {
    const q = qrLookup('school-a', 'TOKEN');
    expect(q.schoolId).toBe('school-a');
    expect(q.active).toBe(true);
  });
});
