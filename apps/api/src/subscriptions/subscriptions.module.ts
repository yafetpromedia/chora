import { Global, Module } from '@nestjs/common';
import { ChapaModule } from '../payments/chapa.module';
import { CouponsService } from './coupons.service';
import { ModuleEntitlementService } from './module-entitlement.service';
import { PlanCatalogService } from './plan-catalog.service';
import { SubscriptionsService } from './subscriptions.service';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';

@Global()
@Module({
  imports: [ChapaModule],
  providers: [
    PlanCatalogService,
    SubscriptionsService,
    CouponsService,
    ModuleEntitlementService,
    SchoolModuleGuard,
  ],
  exports: [
    PlanCatalogService,
    SubscriptionsService,
    CouponsService,
    ModuleEntitlementService,
    SchoolModuleGuard,
  ],
})
export class SubscriptionsModule {}
