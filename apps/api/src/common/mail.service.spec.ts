const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

describe('legacy mail logging', () => {
  it('does not write the recipient address into the error log', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const config = {
      get: (key: string, fallback?: string) =>
        ({
          EMAIL_ENABLED: 'true',
          SMTP_HOST: 'mx1.aletcloud.com',
          SMTP_PORT: '465',
          SMTP_USER: 'info@awuddigitals.com',
          SMTP_PASS: 'mailbox-secret',
          EMAIL_FROM: 'info@awuddigitals.com',
        })[key] ?? fallback,
    };
    mockSendMail.mockRejectedValue(
      new Error('550 parent@example.com mailbox-secret rejected'),
    );
    const service = new MailService(config as never);

    const result = await service.send({
      to: 'parent@example.com',
      subject: 'Attendance',
      text: 'Liya was absent',
    });

    expect(result.sent).toBe(false);
    expect(warn).toHaveBeenCalled();
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).not.toContain('parent@example.com');
    expect(logged).not.toContain('mailbox-secret');
    expect(logged).toContain('[redacted-email]');
    expect(logged).toContain('550');
    warn.mockRestore();
  });
});
