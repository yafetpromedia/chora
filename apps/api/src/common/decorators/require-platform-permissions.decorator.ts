import { SetMetadata } from '@nestjs/common';
import type { PlatformPermissionKey } from '../permissions/platform-permissions';

export const PLATFORM_PERMISSIONS_KEY = 'platform_permissions';

export const RequirePlatformPermissions = (
  ...permissions: PlatformPermissionKey[]
) => SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);
