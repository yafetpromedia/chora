import type { PermissionKey } from './permissions/permission-catalog';
import type { PlatformPermissionKey } from './permissions/platform-permissions';

export type { PermissionKey as SchoolPermissionKey } from './permissions/permission-catalog';
export type { PlatformPermissionKey } from './permissions/platform-permissions';

export type UserRole = 'admin' | 'staff' | 'teacher' | 'student' | 'parent';

export type AuthScope = 'school' | 'platform';

export interface AuthUser {
  id: string;
  schoolId: string;
  role: UserRole;
  permissions: PermissionKey[];
  roleTemplateSlug: string | null;
  roleTemplateName: string | null;
  email: string;
  firstName: string;
  lastName: string;
  scope: 'school';
}

export interface PlatformAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'SUPPORT' | 'SALES';
  permissions: PlatformPermissionKey[];
  scope: 'platform';
}

export type JwtPayload = AuthUser | PlatformAuthUser;

export function isPlatformUser(
  user: JwtPayload | undefined,
): user is PlatformAuthUser {
  return user?.scope === 'platform';
}

export function isSchoolUser(user: JwtPayload | undefined): user is AuthUser {
  return !!user && user.scope === 'school';
}
