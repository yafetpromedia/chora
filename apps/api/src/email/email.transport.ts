import { createTransport, type Transporter } from 'nodemailer';
import type { MailboxId, SmtpSettings } from './email.types';

export function createMailboxTransport(
  settings: SmtpSettings,
  mailboxId: MailboxId,
): Transporter | null {
  const mailbox = settings.mailboxes[mailboxId];
  if (!mailbox?.configured) return null;
  return createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    requireTLS: !settings.secure,
    auth: {
      user: mailbox.address,
      pass: mailbox.password,
    },
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}
