import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeachersModule } from '../teachers/teachers.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { SchoolDayDashboardService } from './school-day-dashboard.service';

@Module({
  imports: [NotificationsModule, TeachersModule, FinanceModule],
  controllers: [DashboardsController],
  providers: [DashboardsService, SchoolDayDashboardService],
})
export class DashboardsModule {}
