import { ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { EmailCategory, MailboxId, PreferenceKey, SchoolEmailPreferenceView, SmtpSettings } from './email.types';
import { PARENT_FACING_CATEGORIES, SENDER_BY_CATEGORY } from './email.types';

const MAX_ATTEMPTS_DEFAULT = 5;
const BACKOFF_MULTIPLIERS = [1, 5, 15, 60, 360];

export function isValidEmail(value: string): boolean {
  if (!value || value.length > 254) return false;
  if (/[\r\n,;]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isSafeHttpUrl(value: string): boolean {
  if (!value || /[\r\n\s]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function makeIdempotencyKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function selectMailbox(
  category: EmailCategory,
  override?: MailboxId,
): MailboxId {
  if (category === 'test' && override) return override;
  return SENDER_BY_CATEGORY[category];
}

export function replyMailbox(category: EmailCategory): MailboxId {
  if (category === 'security_alert') return 'admin';
  if (category === 'support_confirmation') return 'support';
  if (
    category === 'payment_confirmation' ||
    category === 'payment_receipt' ||
    category === 'payment_reminder' ||
    category === 'payment_failed' ||
    category === 'subscription_activation' ||
    category === 'subscription_expiration' ||
    category === 'trial_activation'
  ) {
    return 'sales';
  }
  if (PARENT_FACING_CATEGORIES.has(category)) return 'info';
  if (category === 'school_decision') return 'contact';
  return 'support';
}

export function preferenceAllows(
  prefs: SchoolEmailPreferenceView,
  key: PreferenceKey | null | undefined,
  parentEnabled = true,
): boolean {
  if (!key) return true;
  if (!parentEnabled) return false;
  return prefs[key] !== false;
}

export function validateSmtpSettings(settings: SmtpSettings): string[] {
  const errors: string[] = [];
  if (!settings.host.trim()) errors.push('SMTP host is required');
  if (
    !Number.isInteger(settings.port) ||
    settings.port < 1 ||
    settings.port > 65535
  ) {
    errors.push('SMTP port is invalid');
  }
  if (settings.port === 465 && !settings.secure) {
    errors.push('Port 465 requires SSL/TLS');
  }
  if (settings.port === 587 && settings.secure) {
    errors.push('Port 587 uses STARTTLS and must not force implicit TLS');
  }
  for (const box of Object.values(settings.mailboxes)) {
    if (!isValidEmail(box.address)) {
      errors.push(`${box.id} mailbox address is invalid`);
    }
  }
  return errors;
}

export function isPermanentSmtpError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes('invalid login') ||
    text.includes('authentication') ||
    text.includes('535') ||
    text.includes('550') ||
    text.includes('551') ||
    text.includes('553') ||
    text.includes('invalid recipient') ||
    text.includes('mailbox unavailable') ||
    text.includes('recipient rejected') ||
    text.includes('not configured')
  );
}

export function publicSmtpError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Send failed';
  return message
    .replace(/pass(word)?\s*[=:]\s*\S+/gi, 'password=[redacted]')
    .replace(/auth\s*=\s*\S+/gi, 'auth=[redacted]')
    .slice(0, 300);
}

export function redactStoredError(error: unknown, secrets: string[] = []): string {
  let message = publicSmtpError(error);
  for (const secret of secrets) {
    if (!secret || secret.length < 4) continue;
    message = message.split(secret).join('[redacted]');
  }
  return message.slice(0, 300);
}

export function nextRetryDelayMs(attempts: number, baseMs: number): number {
  const index = Math.min(
    Math.max(attempts - 1, 0),
    BACKOFF_MULTIPLIERS.length - 1,
  );
  return BACKOFF_MULTIPLIERS[index] * Math.max(0, baseMs);
}

export function shouldFailPermanently(
  message: string,
  attempts: number,
  maxAttempts = MAX_ATTEMPTS_DEFAULT,
): boolean {
  return isPermanentSmtpError(message) || attempts >= maxAttempts;
}

export function assertPlatformOwner(role: string | undefined): void {
  if (role !== 'OWNER') {
    throw new ForbiddenException('Only platform owners can manage email');
  }
}

export function cleanTemplateVars(
  vars: Record<string, string | undefined> | undefined,
): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars ?? {})) {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
    if (/password|secret|credential/i.test(key)) continue;
    if (typeof value !== 'string') continue;
    cleaned[key] = value.replace(/[\u0000]/g, '').slice(0, 1000);
  }
  return cleaned;
}
