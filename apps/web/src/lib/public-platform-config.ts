import { getApiBaseUrl } from "@/lib/api";

export const DEFAULT_LANDING_HERO = "/images/hero-campus.png";

export type PublicPlatformConfig = {
  platformName: string;
  allowSelfRegistration: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  welcomeMessage: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultCountry: string;
  defaultTrialDays: number;
  landingHeroImageUrl: string | null;
};

export async function getPublicPlatformConfig(): Promise<PublicPlatformConfig> {
  const res = await fetch(`${getApiBaseUrl()}/auth/platform-config`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Could not load platform config");
  }
  return res.json() as Promise<PublicPlatformConfig>;
}

export function resolveLandingHeroUrl(url: string | null | undefined) {
  const trimmed = url?.trim();
  return trimmed || DEFAULT_LANDING_HERO;
}
