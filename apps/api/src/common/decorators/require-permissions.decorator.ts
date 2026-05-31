import { SetMetadata } from '@nestjs/common';
import { SchoolPermissionKey } from '../permissions/school-permissions';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: SchoolPermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
