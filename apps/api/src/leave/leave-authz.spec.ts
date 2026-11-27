import { permissionMatches } from '../common/permissions/permission-catalog';

/**
 * Mirrors LeaveService cancel/create authorization rules.
 */
function canCancelLeave(opts: {
  isOwner: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  actorRole: string;
  permissions: string[];
}) {
  const canManage =
    opts.actorRole === 'admin' ||
    permissionMatches(opts.permissions, ['leave.manage']) ||
    permissionMatches(opts.permissions, ['leave.approve']);
  if (opts.status !== 'pending' && opts.status !== 'approved') return false;
  if (opts.status === 'approved') return canManage;
  return opts.isOwner || canManage;
}

function canCreateForOther(opts: { actorRole: string; permissions: string[] }) {
  return (
    opts.actorRole === 'admin' ||
    permissionMatches(opts.permissions, ['leave.manage'])
  );
}

describe('leave authorization', () => {
  it('lets owners cancel pending but not approved leave', () => {
    expect(
      canCancelLeave({
        isOwner: true,
        status: 'pending',
        actorRole: 'teacher',
        permissions: ['leave.read', 'leave.request'],
      }),
    ).toBe(true);
    expect(
      canCancelLeave({
        isOwner: true,
        status: 'approved',
        actorRole: 'teacher',
        permissions: ['leave.read', 'leave.request'],
      }),
    ).toBe(false);
  });

  it('blocks reception staff from cancelling others’ approved leave', () => {
    expect(
      canCancelLeave({
        isOwner: false,
        status: 'approved',
        actorRole: 'staff',
        permissions: ['leave.read', 'leave.request'],
      }),
    ).toBe(false);
  });

  it('allows approvers to cancel approved leave', () => {
    expect(
      canCancelLeave({
        isOwner: false,
        status: 'approved',
        actorRole: 'staff',
        permissions: ['leave.read', 'leave.approve'],
      }),
    ).toBe(true);
  });

  it('blocks leave.request-only staff from filing for others', () => {
    expect(
      canCreateForOther({
        actorRole: 'staff',
        permissions: ['leave.request'],
      }),
    ).toBe(false);
    expect(
      canCreateForOther({
        actorRole: 'staff',
        permissions: ['leave.manage'],
      }),
    ).toBe(true);
  });
});
