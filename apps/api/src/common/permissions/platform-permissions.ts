import { PlatformRole } from '@prisma/client';

export const PlatformPermission = {
  SCHOOLS_VIEW: 'platform.schools.view',
  SCHOOLS_CREATE: 'platform.schools.create',
  SCHOOLS_SUSPEND: 'platform.schools.suspend',
  SCHOOLS_DELETE: 'platform.schools.delete',
} as const;

export type PlatformPermissionKey =
  (typeof PlatformPermission)[keyof typeof PlatformPermission];

const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermissionKey[]> = {
  [PlatformRole.OWNER]: Object.values(PlatformPermission),
  [PlatformRole.SUPPORT]: [
    PlatformPermission.SCHOOLS_VIEW,
    PlatformPermission.SCHOOLS_SUSPEND,
  ],
  [PlatformRole.SALES]: [
    PlatformPermission.SCHOOLS_VIEW,
    PlatformPermission.SCHOOLS_CREATE,
  ],
};

export function resolvePlatformPermissions(
  role: PlatformRole,
): PlatformPermissionKey[] {
  return ROLE_PERMISSIONS[role];
}
