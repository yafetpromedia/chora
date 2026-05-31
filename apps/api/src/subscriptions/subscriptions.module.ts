import { Global, Module } from '@nestjs/common';
import { PlanCatalogService } from './plan-catalog.service';
import { SubscriptionsService } from './subscriptions.service';

@Global()
@Module({
  providers: [PlanCatalogService, SubscriptionsService],
  exports: [PlanCatalogService, SubscriptionsService],
})
export class SubscriptionsModule {}
