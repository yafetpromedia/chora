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
