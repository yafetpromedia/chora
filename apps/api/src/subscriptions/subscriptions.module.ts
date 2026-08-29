import { Global, Module } from '@nestjs/common';
import { ChapaModule } from '../payments/chapa.module';
import { CouponsService } from './coupons.service';
import { PlanCatalogService } from './plan-catalog.service';
import { SubscriptionsService } from './subscriptions.service';

@Global()
@Module({
  imports: [ChapaModule],
  providers: [PlanCatalogService, SubscriptionsService, CouponsService],
  exports: [PlanCatalogService, SubscriptionsService, CouponsService],
})
export class SubscriptionsModule {}
