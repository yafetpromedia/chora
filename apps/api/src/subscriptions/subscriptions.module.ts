import { Global, Module } from '@nestjs/common';
import { ChapaModule } from '../payments/chapa.module';
import { PlanCatalogService } from './plan-catalog.service';
import { SubscriptionsService } from './subscriptions.service';

@Global()
@Module({
  imports: [ChapaModule],
  providers: [PlanCatalogService, SubscriptionsService],
  exports: [PlanCatalogService, SubscriptionsService],
})
export class SubscriptionsModule {}
