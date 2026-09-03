import { getApiBaseUrl } from "@/lib/api";

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
  socialInstagramUrl: string | null;
  socialFacebookUrl: string | null;
  socialLinkedinUrl: string | null;
  socialYoutubeUrl: string | null;
  socialTiktokUrl: string | null;
  socialGithubUrl: string | null;
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

/** Custom upload/URL when set; otherwise null (UI uses branded gradient). */
export function resolveLandingHeroUrl(url: string | null | undefined) {
  const trimmed = url?.trim();
  return trimmed || null;
}
