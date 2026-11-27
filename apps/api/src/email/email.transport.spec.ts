import { createMailboxTransport } from './email.transport';
import type { SmtpSettings } from './email.types';

function settings(port: number, secure: boolean): SmtpSettings {
  const mailbox = (
    id: SmtpSettings['mailboxes']['contact']['id'],
    address: string,
  ) => ({ id, address, password: `${id}-secret`, configured: true });
  return {
    enabled: true,
    host: 'mx1.aletcloud.com',
    port,
    secure,
    encryption: secure ? 'SSL/TLS' : 'STARTTLS',
    mailboxes: {
      contact: mailbox('contact', 'contact@awuddigitals.com'),
      support: mailbox('support', 'support@awuddigitals.com'),
      admin: mailbox('admin', 'admin@awuddigitals.com'),
      info: mailbox('info', 'info@awuddigitals.com'),
      sales: mailbox('sales', 'sales@awuddigitals.com'),
    },
  };
}

describe('SMTP transport', () => {
  it('uses implicit TLS on port 465 and STARTTLS on port 587, with timeouts', () => {
    const implicit = createMailboxTransport(settings(465, true), 'contact');
    const startTls = createMailboxTransport(settings(587, false), 'info');
    expect(implicit).not.toBeNull();
    expect(startTls).not.toBeNull();

    const implicitOptions = implicit!.options as {
      secure?: boolean;
      requireTLS?: boolean;
      connectionTimeout?: number;
      greetingTimeout?: number;
      socketTimeout?: number;
      auth?: { user?: string };
    };
    expect(implicitOptions.secure).toBe(true);
    expect(implicitOptions.requireTLS).toBe(false);
    expect(implicitOptions.connectionTimeout).toBe(15_000);
    expect(implicitOptions.greetingTimeout).toBe(15_000);
    expect(implicitOptions.socketTimeout).toBe(30_000);
    expect(implicitOptions.auth?.user).toBe('contact@awuddigitals.com');

    const startTlsOptions = startTls!.options as {
      secure?: boolean;
      requireTLS?: boolean;
      auth?: { user?: string };
    };
    expect(startTlsOptions.secure).toBe(false);
    expect(startTlsOptions.requireTLS).toBe(true);
    expect(startTlsOptions.auth?.user).toBe('info@awuddigitals.com');

    implicit!.close();
    startTls!.close();
  });

  it('does not open a transport for a mailbox without a password', () => {
    const smtp = settings(465, true);
    smtp.mailboxes.sales = {
      ...smtp.mailboxes.sales,
      password: '',
      configured: false,
    };
    expect(createMailboxTransport(smtp, 'sales')).toBeNull();
  });
});
