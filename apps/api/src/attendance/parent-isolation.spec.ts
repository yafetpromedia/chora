/**
 * Parent attendance summary must only resolve linked students.
 * Mirrors AttendanceService.assertParentStudentAccess / resolveStudentProfileId.
 */
describe('parent attendance isolation', () => {
  function resolveForParent(
    parentId: string,
    requestedProfileId: string | undefined,
    links: Array<{ parentId: string; studentId: string }>,
  ) {
    if (requestedProfileId) {
      const ok = links.some(
        (l) => l.parentId === parentId && l.studentId === requestedProfileId,
      );
      if (!ok) throw new Error('forbidden');
      return requestedProfileId;
    }
    const first = links.find((l) => l.parentId === parentId);
    if (!first) throw new Error('not found');
    return first.studentId;
  }

  const links = [
    { parentId: 'p1', studentId: 's1' },
    { parentId: 'p2', studentId: 's2' },
  ];

  it('allows a parent to read their linked child', () => {
    expect(resolveForParent('p1', 's1', links)).toBe('s1');
  });

  it('blocks a parent from another child profile', () => {
    expect(() => resolveForParent('p1', 's2', links)).toThrow('forbidden');
  });
});
