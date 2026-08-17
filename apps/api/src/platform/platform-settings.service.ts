import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BillingCurrency, Plan, PlatformRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

const DEFAULTS: {
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
} = {
  id: 'default',
  platformName: 'Chora',
  supportEmail: null,
  supportPhone: null,
  defaultCountry: 'Ethiopia',
  defaultTimezone: 'Africa/Addis_Ababa',
  allowSelfRegistration: true,
  requireAdminApproval: false,
  defaultTrialDays: 14,
  welcomeMessage: null,
  defaultBillingCurrency: BillingCurrency.USD,
  invoicePrefix: 'INV',
  invoiceGraceDays: 14,
  autoSuspendOverdue: false,
  emailFromName: 'Chora',
  emailReplyTo: null,
  smsSenderName: 'Chora',
  maintenanceMode: false,
  maintenanceMessage: null,
  sessionTimeoutMinutes: 60,
  landingHeroImageUrl: null,
};

export type PlatformSettingsRecord = typeof DEFAULTS & {
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<PlatformSettingsRecord> {
    const row = await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: DEFAULTS,
      update: {},
    });
    return {
      ...DEFAULTS,
      ...row,
      landingHeroImageUrl:
        (row as { landingHeroImageUrl?: string | null }).landingHeroImageUrl ??
        null,
    };
  }

  async updateSettings(dto: UpdatePlatformSettingsDto, role: PlatformRole) {
    if (role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can change settings');
    }

    await this.getSettings();

    const data = {
      ...(dto.platformName !== undefined
        ? { platformName: dto.platformName.trim() }
        : {}),
      ...(dto.supportEmail !== undefined
        ? { supportEmail: dto.supportEmail?.trim() || null }
        : {}),
      ...(dto.supportPhone !== undefined
        ? { supportPhone: dto.supportPhone.trim() || null }
        : {}),
      ...(dto.defaultCountry !== undefined
        ? { defaultCountry: dto.defaultCountry.trim() }
        : {}),
      ...(dto.defaultTimezone !== undefined
        ? { defaultTimezone: dto.defaultTimezone.trim() }
        : {}),
      ...(dto.allowSelfRegistration !== undefined
        ? { allowSelfRegistration: dto.allowSelfRegistration }
        : {}),
      ...(dto.requireAdminApproval !== undefined
        ? { requireAdminApproval: dto.requireAdminApproval }
        : {}),
      ...(dto.defaultTrialDays !== undefined
        ? { defaultTrialDays: dto.defaultTrialDays }
        : {}),
      ...(dto.welcomeMessage !== undefined
        ? { welcomeMessage: dto.welcomeMessage.trim() || null }
        : {}),
      ...(dto.defaultBillingCurrency !== undefined
        ? { defaultBillingCurrency: dto.defaultBillingCurrency }
        : {}),
      ...(dto.invoicePrefix !== undefined
        ? { invoicePrefix: dto.invoicePrefix.trim().toUpperCase() }
        : {}),
      ...(dto.invoiceGraceDays !== undefined
        ? { invoiceGraceDays: dto.invoiceGraceDays }
        : {}),
      ...(dto.autoSuspendOverdue !== undefined
        ? { autoSuspendOverdue: dto.autoSuspendOverdue }
        : {}),
      ...(dto.emailFromName !== undefined
        ? { emailFromName: dto.emailFromName.trim() || null }
        : {}),
      ...(dto.emailReplyTo !== undefined
        ? { emailReplyTo: dto.emailReplyTo?.trim() || null }
        : {}),
      ...(dto.smsSenderName !== undefined
        ? { smsSenderName: dto.smsSenderName.trim() || null }
        : {}),
      ...(dto.maintenanceMode !== undefined
        ? { maintenanceMode: dto.maintenanceMode }
        : {}),
      ...(dto.maintenanceMessage !== undefined
        ? { maintenanceMessage: dto.maintenanceMessage.trim() || null }
        : {}),
      ...(dto.sessionTimeoutMinutes !== undefined
        ? { sessionTimeoutMinutes: dto.sessionTimeoutMinutes }
        : {}),
      ...(dto.landingHeroImageUrl !== undefined
        ? {
            landingHeroImageUrl: dto.landingHeroImageUrl.trim() || null,
          }
        : {}),
    };

    const updated = await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data,
    });

    if (dto.defaultTrialDays !== undefined) {
      await this.prisma.planCatalog.updateMany({
        where: { plan: Plan.TRIAL },
        data: { trialDays: dto.defaultTrialDays },
      });
    }

    return updated;
  }
}
