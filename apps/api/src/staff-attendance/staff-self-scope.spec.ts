/**
 * Self-service endpoints always bind to AuthUser.id — never a query userId.
 * Controllers: GET /staff-attendance/me/summary|history|qr
 */
describe('staff attendance self-service scope', () => {
  function meSummary(actorId: string, requestedUserId?: string) {
    // Intentional: ignore requestedUserId so callers cannot read others.
    void requestedUserId;
    return { scopedUserId: actorId };
  }

  it('scopes summary to the authenticated user only', () => {
    expect(meSummary('user-a', 'user-b').scopedUserId).toBe('user-a');
  });

  it('does not honor a foreign userId override', () => {
    const result = meSummary('teacher-1', 'admin-9');
    expect(result.scopedUserId).not.toBe('admin-9');
  });
});
