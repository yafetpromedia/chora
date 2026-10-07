import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BillingCurrency, Plan, PlatformRole } from '@prisma/client';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  AI_PROVIDERS,
  type AiProviderId,
  UpdatePlatformSettingsDto,
} from './dto/update-platform-settings.dto';

const DEMO_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const DEMO_VIDEO_MAX_BYTES = 250 * 1024 * 1024;

const DEFAULTS = {
  id: 'default',
  platformName: 'Chora',
  supportEmail: null as string | null,
  supportPhone: null as string | null,
  defaultCountry: 'Ethiopia',
  defaultTimezone: 'Africa/Addis_Ababa',
  allowSelfRegistration: true,
  requireAdminApproval: false,
  defaultTrialDays: 14,
  welcomeMessage: null as string | null,
  defaultBillingCurrency: BillingCurrency.USD,
  invoicePrefix: 'INV',
  invoiceGraceDays: 14,
  autoSuspendOverdue: false,
  emailFromName: 'Chora' as string | null,
  emailReplyTo: null as string | null,
  smsSenderName: 'Chora' as string | null,
  maintenanceMode: false,
  maintenanceMessage: null as string | null,
  sessionTimeoutMinutes: 60,
  landingHeroImageUrl: null as string | null,
  demoVideoUrl: null as string | null,
  demoVideoThumbnailUrl: null as string | null,
  bankName: null as string | null,
  bankAccountHolder: null as string | null,
  bankAccountNumber: null as string | null,
  telebirrNumber: null as string | null,
  telebirrAccountName: null as string | null,
  payoutInstructions: null as string | null,
  socialInstagramUrl: null as string | null,
  socialFacebookUrl: null as string | null,
  socialLinkedinUrl: null as string | null,
  socialYoutubeUrl: null as string | null,
  socialTiktokUrl: null as string | null,
  socialGithubUrl: null as string | null,
  aiEnabled: false,
  aiProvider: 'gemini',
  aiApiKey: null as string | null,
  aiModel: null as string | null,
  aiBaseUrl: null as string | null,
};

export type PlatformSettingsRecord = Omit<
  typeof DEFAULTS,
  'defaultBillingCurrency'
> & {
  defaultBillingCurrency: BillingCurrency;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PlatformSettingsPublic = Omit<PlatformSettingsRecord, 'aiApiKey'> & {
  aiConfigured: boolean;
  aiApiKeyMasked: string | null;
};

export type AiRuntimeConfig = {
  source: 'platform' | 'env' | 'none';
  provider: AiProviderId | 'env';
  apiKey: string | null;
  model: string;
  baseUrl: string;
};

export const AI_PROVIDER_PRESETS: Record<
  AiProviderId,
  { baseUrl: string; model: string }
> = {
  gemini: {
    // Native Gemini API (more reliable for AI Studio keys than /openai compat).
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    // Google retires 2.0 Flash for many new keys — 3.8 Flash is the current default.
    model: 'gemini-3.8-flash',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  freemodel: {
    baseUrl: 'https://api.freemodel.dev/v1',
    model: 'claude-t0',
  },
};

/** Models Google often 404s for new AI Studio keys → current replacement. */
const RETIRED_GEMINI_MODELS: Record<string, string> = {
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-001': 'gemini-3.8-flash',
  'gemini-2.5-pro': 'gemini-3.8-flash',
  'gemini-2.5-pro-preview': 'gemini-3.8-flash',
  'gemini-1.5-flash': 'gemini-3.8-flash',
  'gemini-1.5-pro': 'gemini-3.8-flash',
};

export function normalizeGeminiModel(model: string | null | undefined): string {
  const raw = (model ?? '').trim().replace(/^models\//, '');
  if (!raw) return AI_PROVIDER_PRESETS.gemini.model;
  return RETIRED_GEMINI_MODELS[raw] ?? raw;
}

function maskApiKey(key: string | null | undefined): string | null {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return '••••••••';
  return `${'•'.repeat(Math.min(12, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function normalizeProvider(raw: string | null | undefined): AiProviderId {
  const value = (raw ?? 'gemini').trim().toLowerCase();
  return (AI_PROVIDERS as readonly string[]).includes(value)
    ? (value as AiProviderId)
    : 'gemini';
}

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublic(row: PlatformSettingsRecord): PlatformSettingsPublic {
    const { aiApiKey, ...rest } = row;
    return {
      ...rest,
      aiProvider: normalizeProvider(row.aiProvider),
      aiConfigured: Boolean(aiApiKey?.trim()),
      aiApiKeyMasked: maskApiKey(aiApiKey),
    };
  }

  async getSettings(): Promise<PlatformSettingsPublic> {
    const row = await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: DEFAULTS,
      update: {},
    });
    const merged: PlatformSettingsRecord = {
      ...DEFAULTS,
      ...row,
      landingHeroImageUrl:
        (row as { landingHeroImageUrl?: string | null }).landingHeroImageUrl ??
        null,
      demoVideoUrl:
        (row as { demoVideoUrl?: string | null }).demoVideoUrl ?? null,
      demoVideoThumbnailUrl:
        (row as { demoVideoThumbnailUrl?: string | null })
          .demoVideoThumbnailUrl ?? null,
      aiEnabled: Boolean((row as { aiEnabled?: boolean }).aiEnabled),
      aiProvider: normalizeProvider(
        (row as { aiProvider?: string | null }).aiProvider,
      ),
      aiApiKey: (row as { aiApiKey?: string | null }).aiApiKey ?? null,
      aiModel: (row as { aiModel?: string | null }).aiModel ?? null,
      aiBaseUrl: (row as { aiBaseUrl?: string | null }).aiBaseUrl ?? null,
    };
    return this.toPublic(merged);
  }

  /** Internal: full AI credentials for AiService (never expose via HTTP). */
  async getAiRuntimeConfig(env: {
    apiKey?: string | null;
    model?: string | null;
    baseUrl?: string | null;
  }): Promise<AiRuntimeConfig> {
    const row = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
      select: {
        aiEnabled: true,
        aiProvider: true,
        aiApiKey: true,
        aiModel: true,
        aiBaseUrl: true,
      },
    });

    const platformKey = row?.aiApiKey?.trim() || null;
    if (row?.aiEnabled && platformKey) {
      return this.buildAiRuntimeConfig({
        source: 'platform',
        provider: normalizeProvider(row.aiProvider),
        apiKey: platformKey,
        model: row.aiModel,
        baseUrl: row.aiBaseUrl,
      });
    }

    // Platform AI enabled but no key yet — do not silently fall back to a
    // stale env key (that caused confusing 401s while testing Gemini).
    if (row?.aiEnabled && !platformKey) {
      return {
        source: 'none',
        provider: normalizeProvider(row.aiProvider),
        apiKey: null,
        model:
          row.aiModel?.trim() ||
          AI_PROVIDER_PRESETS[normalizeProvider(row.aiProvider)].model,
        baseUrl: (
          row.aiBaseUrl?.trim() ||
          AI_PROVIDER_PRESETS[normalizeProvider(row.aiProvider)].baseUrl
        ).replace(/\/$/, ''),
      };
    }

    const envKey = env.apiKey?.trim() || null;
    if (envKey) {
      return {
        source: 'env',
        provider: 'env',
        apiKey: envKey,
        model: env.model?.trim() || 'claude-t0',
        baseUrl: (env.baseUrl?.trim() || 'https://api.freemodel.dev/v1').replace(
          /\/$/,
          '',
        ),
      };
    }

    return {
      source: 'none',
      provider: 'gemini',
      apiKey: null,
      model: AI_PROVIDER_PRESETS.gemini.model,
      baseUrl: AI_PROVIDER_PRESETS.gemini.baseUrl,
    };
  }

  /** Build runtime config from form values (test-before-save) or stored settings. */
  buildAiRuntimeConfig(input: {
    source?: AiRuntimeConfig['source'];
    provider?: string | null;
    apiKey: string;
    model?: string | null;
    baseUrl?: string | null;
  }): AiRuntimeConfig {
    const provider = normalizeProvider(input.provider);
    const preset = AI_PROVIDER_PRESETS[provider];
    const requested = input.model?.trim() || preset.model;
    return {
      source: input.source ?? 'platform',
      provider,
      apiKey: input.apiKey.trim(),
      model:
        provider === 'gemini' ? normalizeGeminiModel(requested) : requested,
      baseUrl: (input.baseUrl?.trim() || preset.baseUrl).replace(/\/$/, ''),
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
      ...(dto.demoVideoUrl !== undefined
        ? { demoVideoUrl: dto.demoVideoUrl.trim() || null }
        : {}),
      ...(dto.demoVideoThumbnailUrl !== undefined
        ? {
            demoVideoThumbnailUrl: dto.demoVideoThumbnailUrl.trim() || null,
          }
        : {}),
      ...(dto.bankName !== undefined
        ? { bankName: dto.bankName.trim() || null }
        : {}),
      ...(dto.bankAccountHolder !== undefined
        ? { bankAccountHolder: dto.bankAccountHolder.trim() || null }
        : {}),
      ...(dto.bankAccountNumber !== undefined
        ? { bankAccountNumber: dto.bankAccountNumber.trim() || null }
        : {}),
      ...(dto.telebirrNumber !== undefined
        ? { telebirrNumber: dto.telebirrNumber.trim() || null }
        : {}),
      ...(dto.telebirrAccountName !== undefined
        ? { telebirrAccountName: dto.telebirrAccountName.trim() || null }
        : {}),
      ...(dto.payoutInstructions !== undefined
        ? { payoutInstructions: dto.payoutInstructions.trim() || null }
        : {}),
      ...(dto.socialInstagramUrl !== undefined
        ? { socialInstagramUrl: dto.socialInstagramUrl.trim() || null }
        : {}),
      ...(dto.socialFacebookUrl !== undefined
        ? { socialFacebookUrl: dto.socialFacebookUrl.trim() || null }
        : {}),
      ...(dto.socialLinkedinUrl !== undefined
        ? { socialLinkedinUrl: dto.socialLinkedinUrl.trim() || null }
        : {}),
      ...(dto.socialYoutubeUrl !== undefined
        ? { socialYoutubeUrl: dto.socialYoutubeUrl.trim() || null }
        : {}),
      ...(dto.socialTiktokUrl !== undefined
        ? { socialTiktokUrl: dto.socialTiktokUrl.trim() || null }
        : {}),
      ...(dto.socialGithubUrl !== undefined
        ? { socialGithubUrl: dto.socialGithubUrl.trim() || null }
        : {}),
      ...(dto.aiEnabled !== undefined ? { aiEnabled: dto.aiEnabled } : {}),
      ...(dto.aiProvider !== undefined
        ? { aiProvider: normalizeProvider(dto.aiProvider) }
        : {}),
      ...(dto.aiModel !== undefined
        ? { aiModel: dto.aiModel.trim() || null }
        : {}),
      ...(dto.aiBaseUrl !== undefined
        ? { aiBaseUrl: dto.aiBaseUrl.trim() || null }
        : {}),
      ...(dto.aiApiKey !== undefined
        ? dto.aiApiKey === null
          ? { aiApiKey: null }
          : dto.aiApiKey.trim()
            ? { aiApiKey: dto.aiApiKey.trim() }
            : {}
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

    const merged: PlatformSettingsRecord = {
      ...DEFAULTS,
      ...updated,
      aiEnabled: Boolean((updated as { aiEnabled?: boolean }).aiEnabled),
      aiProvider: normalizeProvider(
        (updated as { aiProvider?: string | null }).aiProvider,
      ),
      aiApiKey: (updated as { aiApiKey?: string | null }).aiApiKey ?? null,
      aiModel: (updated as { aiModel?: string | null }).aiModel ?? null,
      aiBaseUrl: (updated as { aiBaseUrl?: string | null }).aiBaseUrl ?? null,
    };
    return this.toPublic(merged);
  }

  async getPayoutInstructions() {
    const settings = await this.getSettings();
    const hasBank = !!settings.bankName?.trim() && !!settings.bankAccountNumber?.trim();
    const hasTelebirr = !!settings.telebirrNumber?.trim();
    return {
      bank: hasBank
        ? {
            bankName: settings.bankName!,
            accountHolder:
              settings.bankAccountHolder?.trim() || settings.bankName!,
            accountNumber: settings.bankAccountNumber!,
          }
        : null,
      telebirr: hasTelebirr
        ? {
            number: settings.telebirrNumber!,
            accountName:
              settings.telebirrAccountName?.trim() ||
              settings.bankAccountHolder?.trim() ||
              settings.platformName,
          }
        : null,
      instructions: settings.payoutInstructions?.trim() || null,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
    };
  }

  private demoUploadRoot() {
    return join(process.cwd(), 'uploads', 'platform-demo');
  }

  async saveDemoVideoFile(
    file: { originalname: string; buffer: Buffer; mimetype: string },
    actorRole: PlatformRole,
  ) {
    if (actorRole !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can upload the demo video');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Upload a video file');
    }
    if (file.buffer.length > DEMO_VIDEO_MAX_BYTES) {
      throw new BadRequestException('Video must be 250 MB or smaller');
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (!DEMO_VIDEO_MIME.has(mime)) {
      throw new BadRequestException('Use an MP4, WebM, or MOV video');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = extname(safeName) || (mime === 'video/webm' ? '.webm' : '.mp4');
    const filename = `demo-${Date.now()}${ext}`;
    const root = this.demoUploadRoot();
    await mkdir(root, { recursive: true });
    await writeFile(join(root, filename), file.buffer);

    const demoVideoUrl = `/platform/demo/files/${filename}`;
    return this.updateSettings({ demoVideoUrl }, actorRole);
  }

  getDemoVideoFilePath(filename: string) {
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Invalid file');
    }
    const path = join(this.demoUploadRoot(), filename);
    if (!existsSync(path)) {
      throw new BadRequestException('File not found');
    }
    return path;
  }
}
