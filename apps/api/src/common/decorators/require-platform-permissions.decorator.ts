import { SetMetadata } from '@nestjs/common';
import type { PlatformPermissionKey } from '../permissions/platform-permissions';

export const PLATFORM_PERMISSIONS_KEY = 'platform_permissions';
export const PLATFORM_OWNER_ONLY_KEY = 'platform_owner_only';

export const RequirePlatformPermissions = (
  ...permissions: PlatformPermissionKey[]
) => SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);

/** Content catalog / platform settings — Owner console only. */
export const RequirePlatformOwner = () =>
  SetMetadata(PLATFORM_OWNER_ONLY_KEY, true);
