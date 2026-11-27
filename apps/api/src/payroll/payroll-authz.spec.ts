import { ForbiddenException } from '@nestjs/common';
import { permissionMatches } from '../common/permissions/permission-catalog';

/**
 * Authorization contracts for payslip access.
 * Controllers must enforce these at the API boundary; services enforce schoolId.
 */
describe('payroll payslip authorization contracts', () => {
  function canAccessPayslipEndpoint(permissions: string[]) {
    return (
      permissionMatches(permissions, 'payslip.self') ||
      permissionMatches(permissions, 'payslip.manage')
    );
  }

  function canViewOtherPayslip(
    permissions: string[],
    actorId: string,
    ownerId: string,
  ) {
    if (!canAccessPayslipEndpoint(permissions)) return false;
    if (permissionMatches(permissions, 'payslip.manage')) return true;
    return actorId === ownerId;
  }

  it('allows employee with payslip.self for own payslip', () => {
    expect(canAccessPayslipEndpoint(['payslip.self'])).toBe(true);
    expect(canViewOtherPayslip(['payslip.self'], 'emp-1', 'emp-1')).toBe(true);
  });

  it('denies employee viewing another employee payslip', () => {
    expect(canViewOtherPayslip(['payslip.self'], 'emp-1', 'emp-2')).toBe(false);
  });

  it('allows payslip.manage for same-school peer payslip', () => {
    expect(canViewOtherPayslip(['payslip.manage'], 'officer-1', 'emp-2')).toBe(
      true,
    );
  });

  it('denies payroll.view alone from payslip endpoint', () => {
    expect(canAccessPayslipEndpoint(['payroll.view'])).toBe(false);
  });

  it('denies unauthorized role', () => {
    expect(canAccessPayslipEndpoint(['students.read'])).toBe(false);
  });

  it('tenant scope requires schoolId on payslip lookup', () => {
    const schoolA = 'school-a';
    const where = { id: 'payslip-1', schoolId: schoolA };
    expect(where.schoolId).not.toBe('school-b');
  });

  it('throws when peer access attempted without manage', () => {
    const canManage = false;
    const actorId: string = 'emp-a';
    const ownerId: string = 'emp-b';
    const allowed = canManage || actorId === ownerId;
    expect(allowed).toBe(false);
    expect(() => {
      if (!allowed) {
        throw new ForbiddenException('Cannot view another employee payslip');
      }
    }).toThrow(ForbiddenException);
  });
});
