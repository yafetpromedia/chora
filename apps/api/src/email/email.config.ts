import { ConfigService } from '@nestjs/config';
import type { MailboxId, SmtpSettings } from './email.types';

const MAILBOX_ENV: Record<
  MailboxId,
  { address: string; password: string; fallback: string }
> = {
  contact: {
    address: 'CHORA_CONTACT_EMAIL',
    password: 'CHORA_CONTACT_EMAIL_PASSWORD',
    fallback: 'contact@awuddigitals.com',
  },
  support: {
    address: 'CHORA_SUPPORT_EMAIL',
    password: 'CHORA_SUPPORT_EMAIL_PASSWORD',
    fallback: 'support@awuddigitals.com',
  },
  admin: {
    address: 'CHORA_ADMIN_EMAIL',
    password: 'CHORA_ADMIN_EMAIL_PASSWORD',
    fallback: 'admin@awuddigitals.com',
  },
  info: {
    address: 'CHORA_INFO_EMAIL',
    password: 'CHORA_INFO_EMAIL_PASSWORD',
    fallback: 'info@awuddigitals.com',
  },
  sales: {
    address: 'CHORA_SALES_EMAIL',
    password: 'CHORA_SALES_EMAIL_PASSWORD',
    fallback: 'sales@awuddigitals.com',
  },
};

function flag(value: unknown): boolean {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function text(config: ConfigService, key: string): string {
  return config.get<string>(key)?.trim() ?? '';
}

export function readSmtpSettings(config: ConfigService): SmtpSettings {
  const enabled = flag(text(config, 'CHORA_EMAIL_ENABLED')) || flag(text(config, 'EMAIL_ENABLED'));
  const host = text(config, 'CHORA_SMTP_HOST') || text(config, 'SMTP_HOST') || 'mx1.aletcloud.com';
  const portValue = Number(text(config, 'CHORA_SMTP_PORT') || text(config, 'SMTP_PORT') || '465');
  const port = Number.isFinite(portValue) ? portValue : 465;
  const secureRaw = text(config, 'CHORA_SMTP_SECURE');
  const secure = secureRaw ? flag(secureRaw) : port === 465;
  const legacyUser = (text(config, 'SMTP_USER') || '').toLowerCase();
  const legacyPass = config.get<string>('SMTP_PASS') ?? '';

  const mailboxes = {} as SmtpSettings['mailboxes'];
  for (const id of Object.keys(MAILBOX_ENV) as MailboxId[]) {
    const env = MAILBOX_ENV[id];
    const address = (text(config, env.address) || env.fallback).toLowerCase();
    let password = config.get<string>(env.password) ?? '';
    if (!password && legacyUser && legacyUser === address) {
      password = legacyPass;
    }
    mailboxes[id] = {
      id,
      address,
      password,
      configured: Boolean(password),
    };
  }

  return {
    enabled,
    host,
    port,
    secure,
    encryption: secure ? 'SSL/TLS' : 'STARTTLS',
    mailboxes,
  };
}

export function retryBaseMs(config: ConfigService): number {
  const raw = Number(text(config, 'CHORA_EMAIL_RETRY_BASE_MS') || '60000');
  return Number.isFinite(raw) && raw >= 0 ? raw : 60000;
}

export function maxAttempts(config: ConfigService): number {
  const raw = Number(text(config, 'CHORA_EMAIL_MAX_ATTEMPTS') || '5');
  if (!Number.isFinite(raw)) return 5;
  return Math.min(8, Math.max(1, Math.floor(raw)));
}
