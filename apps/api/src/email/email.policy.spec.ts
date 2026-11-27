import { ForbiddenException } from '@nestjs/common';
import { readSmtpSettings } from './email.config';
import {
  assertPlatformOwner,
  isPermanentSmtpError,
  redactStoredError,
  sanitizeHeader,
  selectMailbox,
  validateSmtpSettings,
} from './email.policy';
import type { SmtpSettings } from './email.types';

function settings(overrides: Partial<SmtpSettings> = {}): SmtpSettings {
  const base: SmtpSettings = {
    enabled: true,
    host: 'mx1.aletcloud.com',
    port: 465,
    secure: true,
    encryption: 'SSL/TLS',
    mailboxes: {
      contact: { id: 'contact', address: 'contact@awuddigitals.com', password: 'x', configured: true },
      support: { id: 'support', address: 'support@awuddigitals.com', password: 'x', configured: true },
      admin: { id: 'admin', address: 'admin@awuddigitals.com', password: 'x', configured: true },
      info: { id: 'info', address: 'info@awuddigitals.com', password: 'x', configured: true },
      sales: { id: 'sales', address: 'sales@awuddigitals.com', password: 'x', configured: true },
    },
  };
  return { ...base, ...overrides, mailboxes: overrides.mailboxes ?? base.mailboxes };
}

describe('SMTP configuration', () => {
  it('accepts implicit TLS on port 465 and STARTTLS on port 587', () => {
    expect(validateSmtpSettings(settings())).toEqual([]);
    expect(
      validateSmtpSettings(settings({ port: 587, secure: false, encryption: 'STARTTLS' })),
    ).toEqual([]);
    expect(validateSmtpSettings(settings({ port: 465, secure: false }))).toContain(
      'Port 465 requires SSL/TLS',
    );
    expect(validateSmtpSettings(settings({ port: 587, secure: true }))).toContain(
      'Port 587 uses STARTTLS and must not force implicit TLS',
    );
  });

  it('reads Alet defaults and keeps each mailbox password separate', () => {
    const config = {
      get: (key: string) =>
        ({
          CHORA_EMAIL_ENABLED: 'true',
          CHORA_SMTP_PORT: '587',
          CHORA_SMTP_SECURE: 'false',
          CHORA_CONTACT_EMAIL_PASSWORD: 'contact-secret',
          CHORA_INFO_EMAIL_PASSWORD: 'info-secret',
        })[key],
    };
    const smtp = readSmtpSettings(config as never);
    expect(smtp.host).toBe('mx1.aletcloud.com');
    expect(smtp.port).toBe(587);
    expect(smtp.encryption).toBe('STARTTLS');
    expect(smtp.mailboxes.contact.password).toBe('contact-secret');
    expect(smtp.mailboxes.info.password).toBe('info-secret');
    expect(smtp.mailboxes.support.configured).toBe(false);
  });
});

describe('sender selection', () => {
  it('maps each category to the matching Awud Digitals mailbox', () => {
    expect(selectMailbox('welcome')).toBe('contact');
    expect(selectMailbox('password_reset')).toBe('contact');
    expect(selectMailbox('support_confirmation')).toBe('support');
    expect(selectMailbox('security_alert')).toBe('admin');
    expect(selectMailbox('student_absence')).toBe('info');
    expect(selectMailbox('announcement')).toBe('info');
    expect(selectMailbox('payment_receipt')).toBe('sales');
    expect(selectMailbox('subscription_activation')).toBe('sales');
    expect(selectMailbox('test', 'sales')).toBe('sales');
    expect(selectMailbox('welcome', 'sales')).toBe('contact');
  });
});

describe('email safety helpers', () => {
  it('strips header injection from subjects', () => {
    expect(sanitizeHeader('Hello\r\nBcc: evil@example.com')).toBe(
      'Hello Bcc: evil@example.com',
    );
  });

  it('treats authentication and unknown-recipient failures as permanent', () => {
    expect(isPermanentSmtpError('Invalid login: 535 5.7.8')).toBe(true);
    expect(isPermanentSmtpError('550 mailbox unavailable')).toBe(true);
    expect(isPermanentSmtpError('Connection timeout')).toBe(false);
  });

  it('removes a bare mailbox password from a stored SMTP error', () => {
    expect(redactStoredError(new Error('535 failed contact-secret'), ['contact-secret'])).toBe(
      '535 failed [redacted]',
    );
  });

  it('allows only platform owners to manage email', () => {
    expect(() => assertPlatformOwner('OWNER')).not.toThrow();
    expect(() => assertPlatformOwner('SUPPORT')).toThrow(ForbiddenException);
  });
});
