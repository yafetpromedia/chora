import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const enabled =
      this.config.get<string>('EMAIL_ENABLED', 'false') === 'true';
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!enabled || !host) {
      return;
    }

    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  async send(
    input: SendMailInput,
  ): Promise<{ sent: boolean; reason?: string }> {
    if (!this.transporter) {
      return { sent: false, reason: 'Email is not configured' };
    }

    const from =
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      '';
    if (!from || /noreply@/i.test(from)) {
      return {
        sent: false,
        reason: 'Set a real Awud Digitals mailbox as the From address',
      };
    }

    try {
      await this.transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html ?? input.text.replace(/\n/g, '<br/>'),
      });
      return { sent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed';
      const detail = redactMailLog(
        message,
        this.config.get<string>('SMTP_PASS'),
      );
      this.logger.warn(`Failed to send email to [redacted-email]: ${detail}`);
      return { sent: false, reason: message };
    }
  }
}

function redactMailLog(message: string, password?: string): string {
  let text = message.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    '[redacted-email]',
  );
  const secret = password?.trim();
  if (secret && secret.length >= 4) {
    text = text.split(secret).join('[redacted]');
  }
  return text.slice(0, 300);
}
