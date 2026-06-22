import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ChapaModule } from './chapa.module';
import { ChapaWebhookController } from './chapa-webhook.controller';

@Module({
  imports: [ChapaModule, FinanceModule, SubscriptionsModule],
  controllers: [ChapaWebhookController],
})
export class PaymentsModule {}
