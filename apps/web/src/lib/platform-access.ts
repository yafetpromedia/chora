import { platformFetch } from "@/lib/platform-auth";
import type { PlatformUser } from "@/lib/platform-auth";
import type { PlatformSection } from "@/components/platform/platform-types";

export type PlatformPermissionKey =
  | "platform.schools.view"
  | "platform.schools.create"
  | "platform.schools.suspend"
  | "platform.schools.delete"
  | "platform.support.manage"
  | "platform.billing.manage";

export function hasPlatformPermission(
  user: { role?: string; permissions?: string[] } | null | undefined,
  key: PlatformPermissionKey,
) {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  // Support role always has inbox access (matches API defaults).
  if (key === "platform.support.manage" && user.role === "SUPPORT") return true;
  return (user.permissions ?? []).includes(key);
}

/**
 * Which console sections each role can open.
 * Content catalog (packages, subjects, …) is Owner-only until we add dedicated grants.
 */
export function canAccessPlatformSection(
  user: PlatformUser | null | undefined,
  section: PlatformSection,
): boolean {
  if (!user) return false;
  if (user.role === "OWNER") return true;

  switch (section) {
    case "profile":
      return true;
    case "overview":
    case "schools":
    case "usage":
      return hasPlatformPermission(user, "platform.schools.view");
    case "support":
      return hasPlatformPermission(user, "platform.support.manage");
    case "billing":
    case "invoices":
    case "plans":
    case "coupons":
      return hasPlatformPermission(user, "platform.billing.manage");
    case "messages":
    case "permissions":
    case "settings":
    case "curriculum":
    case "subjects":
    case "library":
    case "structures":
    case "assessments":
    case "provisioning":
      return false;
    default:
      return false;
  }
}

export type PlatformAccessCatalogItem = {
  key: PlatformPermissionKey;
  label: string;
  description: string;
};

export type PlatformAccessRole = {
  id: PlatformUser["role"];
  title: string;
  description: string;
  editable: boolean;
  grants: PlatformPermissionKey[];
};

export type PlatformOperator = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PlatformUser["role"];
  createdAt: string;
  permissions: PlatformPermissionKey[];
};

export type PlatformAccessControl = {
  catalog: PlatformAccessCatalogItem[];
  roles: PlatformAccessRole[];
  operators: PlatformOperator[];
};

export async function getPlatformAccessControl() {
  return platformFetch<PlatformAccessControl>("/platform/access-control");
}

export async function updatePlatformRoleGrants(body: {
  SUPPORT?: PlatformPermissionKey[];
  SALES?: PlatformPermissionKey[];
}) {
  return platformFetch<PlatformAccessControl>("/platform/access-control/roles", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updatePlatformOperatorRole(
  userId: string,
  role: PlatformUser["role"],
) {
  return platformFetch<PlatformAccessControl>(
    `/platform/access-control/operators/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}

export async function createPlatformOperator(body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: PlatformUser["role"];
}) {
  return platformFetch<PlatformAccessControl>("/platform/access-control/operators", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deletePlatformOperator(userId: string) {
  return platformFetch<PlatformAccessControl>(
    `/platform/access-control/operators/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}
