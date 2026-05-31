import { platformFetch } from "@/lib/platform-auth";

export type PlatformProfile = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "OWNER" | "SUPPORT" | "SALES";
    permissions: string[];
    createdAt: string;
  };
};

export async function getPlatformProfile() {
  return platformFetch<PlatformProfile>("/platform/auth/profile");
}

export async function updatePlatformProfile(payload: {
  firstName?: string;
  lastName?: string;
  newPassword?: string;
}) {
  return platformFetch<PlatformProfile>("/platform/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
