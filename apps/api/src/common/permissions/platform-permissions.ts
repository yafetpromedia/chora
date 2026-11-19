import { PlatformRole } from '@prisma/client';

export const PlatformPermission = {
  SCHOOLS_VIEW: 'platform.schools.view',
  SCHOOLS_CREATE: 'platform.schools.create',
  SCHOOLS_SUSPEND: 'platform.schools.suspend',
  SCHOOLS_DELETE: 'platform.schools.delete',
  SUPPORT_MANAGE: 'platform.support.manage',
  BILLING_MANAGE: 'platform.billing.manage',
} as const;

export type PlatformPermissionKey =
  (typeof PlatformPermission)[keyof typeof PlatformPermission];

export const PLATFORM_PERMISSION_CATALOG: {
  key: PlatformPermissionKey;
  label: string;
  description: string;
}[] = [
  {
    key: PlatformPermission.SCHOOLS_VIEW,
    label: 'View schools & dashboard',
    description: 'Read tenant list, usage, and platform KPIs',
  },
  {
    key: PlatformPermission.SCHOOLS_CREATE,
    label: 'Create tenant schools',
    description: 'Onboard new schools with admin accounts',
  },
  {
    key: PlatformPermission.SCHOOLS_SUSPEND,
    label: 'Suspend / activate schools',
    description: 'Control tenant access immediately',
  },
  {
    key: PlatformPermission.SCHOOLS_DELETE,
    label: 'Delete tenants',
    description: 'Permanently remove tenant workspaces and data',
  },
  {
    key: PlatformPermission.SUPPORT_MANAGE,
    label: 'Support inbox',
    description: 'View and update school support tickets across tenants',
  },
  {
    key: PlatformPermission.BILLING_MANAGE,
    label: 'Billing & coupons',
    description: 'Issue invoices, mark them paid, and manage coupon codes',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  PlatformRole,
  PlatformPermissionKey[]
> = {
  [PlatformRole.OWNER]: Object.values(PlatformPermission),
  [PlatformRole.SUPPORT]: [
    PlatformPermission.SCHOOLS_VIEW,
    PlatformPermission.SCHOOLS_SUSPEND,
    PlatformPermission.SUPPORT_MANAGE,
  ],
  [PlatformRole.SALES]: [
    PlatformPermission.SCHOOLS_VIEW,
    PlatformPermission.SCHOOLS_CREATE,
  ],
};

const ALL_KEYS = new Set<string>(Object.values(PlatformPermission));

export function isPlatformPermissionKey(
  value: string,
): value is PlatformPermissionKey {
  return ALL_KEYS.has(value);
}

export function normalizeRoleGrants(
  role: PlatformRole,
  grants: unknown,
): PlatformPermissionKey[] {
  if (role === PlatformRole.OWNER) {
    return [...DEFAULT_ROLE_PERMISSIONS.OWNER];
  }
  if (!Array.isArray(grants)) {
    return [...DEFAULT_ROLE_PERMISSIONS[role]];
  }
  const cleaned = [
    ...new Set(
      grants.filter(
        (g): g is PlatformPermissionKey =>
          typeof g === 'string' && isPlatformPermissionKey(g),
      ),
    ),
  ];
  // Non-owner roles always keep view so the console stays usable.
  if (!cleaned.includes(PlatformPermission.SCHOOLS_VIEW)) {
    cleaned.unshift(PlatformPermission.SCHOOLS_VIEW);
  }
  // Support operators always keep inbox access — core to the role.
  if (
    role === PlatformRole.SUPPORT &&
    !cleaned.includes(PlatformPermission.SUPPORT_MANAGE)
  ) {
    cleaned.push(PlatformPermission.SUPPORT_MANAGE);
  }
  return cleaned;
}

export function parseStoredRolePermissions(
  raw: unknown,
): Record<PlatformRole, PlatformPermissionKey[]> {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    OWNER: [...DEFAULT_ROLE_PERMISSIONS.OWNER],
    SUPPORT: normalizeRoleGrants(PlatformRole.SUPPORT, source.SUPPORT),
    SALES: normalizeRoleGrants(PlatformRole.SALES, source.SALES),
  };
}

/** Sync fallback used before DB cache is warm. */
export function resolvePlatformPermissions(
  role: PlatformRole,
): PlatformPermissionKey[] {
  return [...DEFAULT_ROLE_PERMISSIONS[role]];
}
