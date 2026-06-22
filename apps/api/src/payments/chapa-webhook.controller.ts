import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FinanceService } from '../finance/finance.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ChapaService } from './chapa.service';

function isSubscriptionTxRef(txRef: string): boolean {
  return txRef.startsWith('C1SUB-');
}

@Controller('payments/chapa')
export class ChapaWebhookController {
  constructor(
    private readonly chapaService: ChapaService,
    private readonly financeService: FinanceService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('webhook')
  async webhook(
    @Body() body: { event?: string; status?: string; tx_ref?: string },
    @Headers('x-chapa-signature') xChapaSignature?: string,
    @Headers('chapa-signature') chapaSignature?: string,
  ) {
    const signature = xChapaSignature ?? chapaSignature;
    if (!this.chapaService.verifyWebhookSignature(body, signature)) {
      throw new UnauthorizedException('Invalid Chapa webhook signature');
    }

    if (
      body.event === 'charge.success' &&
      body.status === 'success' &&
      body.tx_ref
    ) {
      await this.completeByTxRef(body.tx_ref);
    }

    return { ok: true };
  }

  @Get('callback')
  async callback(
    @Query('trx_ref') trxRef: string | undefined,
    @Query('tx_ref') txRef: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const ref = trxRef?.trim() || txRef?.trim() || '';
    const webApp = process.env.WEB_APP_URL?.trim() || 'http://localhost:3000';

    if (ref && status === 'success') {
      try {
        await this.completeByTxRef(ref);
      } catch {
        // Return page will retry verification.
      }
    }

    const redirect = isSubscriptionTxRef(ref)
      ? new URL('/admin/billing/plans', webApp)
      : new URL('/parent/fees', webApp);

    redirect.searchParams.set('chapa_return', '1');
    if (ref) redirect.searchParams.set('tx_ref', ref);
    if (status) redirect.searchParams.set('status', status);

    res.redirect(redirect.toString());
  }

  private async completeByTxRef(txRef: string) {
    if (isSubscriptionTxRef(txRef)) {
      await this.subscriptionsService.completePlanCheckout(txRef);
      return;
    }
    await this.financeService.completeChapaPayment(txRef);
  }
}
