import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export type ChapaInitializePayload = {
  amount: string;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  tx_ref: string;
  callback_url: string;
  return_url: string;
  customization?: { title?: string; description?: string };
};

export type ChapaVerifyResult = {
  status: string;
  amount: string;
  currency: string;
  reference: string;
  tx_ref: string;
};

@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly apiBase = 'https://api.chapa.co/v1';

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('CHAPA_SECRET_KEY')?.trim() ?? '';
    const webhookSecret =
      this.config.get<string>('CHAPA_WEBHOOK_SECRET')?.trim() ?? '';
    this.webhookSecret = webhookSecret || this.secretKey;
  }

  isConfigured(): boolean {
    return this.secretKey.length > 0;
  }

  /** Live Chapa checkout — off unless CHAPA_ENABLED=true and a secret key is set. */
  isLiveEnabled(): boolean {
    const flag = this.config.get<string>('CHAPA_ENABLED')?.trim().toLowerCase();
    return flag === 'true' && this.isConfigured();
  }

  verifyWebhookSignature(
    body: unknown,
    signature: string | undefined,
  ): boolean {
    if (!this.webhookSecret || !signature?.trim()) return false;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');
    const received = signature.trim();
    if (expected.length !== received.length) return false;
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    } catch {
      return false;
    }
  }

  async initializeTransaction(
    payload: ChapaInitializePayload,
  ): Promise<{ checkout_url: string }> {
    const res = await fetch(`${this.apiBase}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      status?: string;
      message?: string;
      data?: { checkout_url?: string };
    };

    if (!res.ok || data.status !== 'success' || !data.data?.checkout_url) {
      this.logger.warn(
        `Chapa initialize failed: ${data.message ?? res.statusText}`,
      );
      throw new Error(data.message ?? 'Chapa initialization failed');
    }

    return { checkout_url: data.data.checkout_url };
  }

  async verifyTransaction(txRef: string): Promise<ChapaVerifyResult> {
    const res = await fetch(
      `${this.apiBase}/transaction/verify/${encodeURIComponent(txRef)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.secretKey}` },
      },
    );

    const data = (await res.json()) as {
      status?: string;
      message?: string;
      data?: ChapaVerifyResult;
    };

    if (!res.ok || data.status !== 'success' || !data.data) {
      this.logger.warn(
        `Chapa verify failed for ${txRef}: ${data.message ?? res.statusText}`,
      );
      throw new Error(data.message ?? 'Chapa verification failed');
    }

    return data.data;
  }
}
