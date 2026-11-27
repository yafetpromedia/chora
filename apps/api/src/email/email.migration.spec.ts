import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../prisma/migrations/20261124120000_email_delivery/migration.sql'),
  'utf8',
);

function columns(table: string): string[] {
  const match = sql.match(new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\n\\);`));
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('"'))
    .map((line) => line.match(/^"([A-Za-z0-9_]+)"/)?.[1] ?? '');
}

describe('email delivery migration SQL', () => {
  it('matches the Prisma models and does not mutate existing data', () => {
    expect(sql).not.toMatch(/^\s*(DROP|TRUNCATE|DELETE|INSERT)\b/im);
    expect(sql).not.toMatch(/\bUPDATE\s+"/i);
    expect(sql).not.toMatch(/"[^"]*password[^"]*"/i);
    expect(sql).toContain(
      `CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED')`,
    );
    expect(columns('EmailDelivery')).toEqual([
      'id',
      'schoolId',
      'recipient',
      'sender',
      'replyTo',
      'subject',
      'category',
      'templateId',
      'status',
      'attempts',
      'maxAttempts',
      'nextAttemptAt',
      'lastError',
      'idempotencyKey',
      'providerMessageId',
      'variables',
      'createdAt',
      'updatedAt',
      'sentAt',
    ]);
    expect(columns('SchoolEmailPreference')).toEqual([
      'schoolId',
      'absenceEnabled',
      'lateEnabled',
      'examinationEnabled',
      'announcementEnabled',
      'paymentReminderEnabled',
      'paymentConfirmationEnabled',
      'reportCardEnabled',
      'updatedAt',
    ]);
    expect(columns('ParentEmailPreference')).toEqual([
      'userId',
      'schoolId',
      'enabled',
      'absenceEnabled',
      'lateEnabled',
      'examinationEnabled',
      'announcementEnabled',
      'paymentReminderEnabled',
      'paymentConfirmationEnabled',
      'reportCardEnabled',
      'updatedAt',
    ]);
    expect(columns('EmailSystemState')).toEqual([
      'id',
      'lastTestAt',
      'lastTestOk',
      'lastTestError',
      'lastTestMailbox',
      'updatedAt',
    ]);
    expect(sql).toContain('CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key"');
    expect(sql).toContain('ON DELETE SET NULL');
    expect(sql).toContain('ON DELETE CASCADE');
  });
});
