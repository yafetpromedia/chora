import type { BillingCurrency } from "@/lib/platform-billing";
import { platformFetch } from "@/lib/platform-auth";

export type PlatformSettings = {
  id: string;
  platformName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultCountry: string;
  defaultTimezone: string;
  allowSelfRegistration: boolean;
  requireAdminApproval: boolean;
  defaultTrialDays: number;
  welcomeMessage: string | null;
  defaultBillingCurrency: BillingCurrency;
  invoicePrefix: string;
  invoiceGraceDays: number;
  autoSuspendOverdue: boolean;
  emailFromName: string | null;
  emailReplyTo: string | null;
  smsSenderName: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  sessionTimeoutMinutes: number;
  landingHeroImageUrl: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  telebirrNumber: string | null;
  telebirrAccountName: string | null;
  payoutInstructions: string | null;
  socialInstagramUrl: string | null;
  socialFacebookUrl: string | null;
  socialLinkedinUrl: string | null;
  socialYoutubeUrl: string | null;
  socialTiktokUrl: string | null;
  socialGithubUrl: string | null;
  updatedAt: string;
};

export type UpdatePlatformSettingsInput = Partial<{
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCountry: string;
  defaultTimezone: string;
  allowSelfRegistration: boolean;
  requireAdminApproval: boolean;
  defaultTrialDays: number;
  welcomeMessage: string;
  defaultBillingCurrency: BillingCurrency;
  invoicePrefix: string;
  invoiceGraceDays: number;
  autoSuspendOverdue: boolean;
  emailFromName: string;
  emailReplyTo: string;
  smsSenderName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  sessionTimeoutMinutes: number;
  landingHeroImageUrl: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  telebirrNumber: string;
  telebirrAccountName: string;
  payoutInstructions: string;
  socialInstagramUrl: string;
  socialFacebookUrl: string;
  socialLinkedinUrl: string;
  socialYoutubeUrl: string;
  socialTiktokUrl: string;
  socialGithubUrl: string;
}>;

export function getPlatformSettings() {
  return platformFetch<PlatformSettings>("/platform/settings");
}

export function updatePlatformSettings(body: UpdatePlatformSettingsInput) {
  return platformFetch<PlatformSettings>("/platform/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
