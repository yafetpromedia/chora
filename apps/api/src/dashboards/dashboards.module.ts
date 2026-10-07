import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { StaffAttendanceModule } from '../staff-attendance/staff-attendance.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AdminAnalyticsService } from './admin-analytics.service';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { SchoolDayDashboardService } from './school-day-dashboard.service';

@Module({
  imports: [
    NotificationsModule,
    TeachersModule,
    FinanceModule,
    AttendanceModule,
    StaffAttendanceModule,
  ],
  controllers: [DashboardsController],
  providers: [DashboardsService, SchoolDayDashboardService, AdminAnalyticsService],
  exports: [AdminAnalyticsService],
})
export class DashboardsModule {}
