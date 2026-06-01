import { UserRole } from '@prisma/client';
import {
  PermissionCatalog,
  permissionMatches,
  type PermissionKey,
} from './permission-catalog';

/** @deprecated Use PermissionCatalog — re-exported for existing controllers. */
export const SchoolPermission = PermissionCatalog;

export type SchoolPermissionKey = PermissionKey;

export function hasSchoolPermission(
  permissions: string[],
  required: string | string[],
): boolean {
  return permissionMatches(permissions, required);
}

/** Portal roles that use the staff/admin workspace with permission-filtered nav. */
export function usesStaffWorkspace(role: UserRole): boolean {
  return role === UserRole.admin || role === UserRole.staff;
}
