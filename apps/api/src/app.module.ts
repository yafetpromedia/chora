import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnnouncementsModule } from './announcements/announcements.module';
import { FayedaModule } from './fayeda/fayeda.module';
import { FinanceModule } from './finance/finance.module';
import { PlatformModule } from './platform/platform.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { DashboardsModule } from './dashboards/dashboards.module';
import { GradesModule } from './grades/grades.module';
import { PermissionsModule } from './permissions/permissions.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResultsModule } from './results/results.module';
import { ClassworkModule } from './classwork/classwork.module';
import { TimetableModule } from './timetable/timetable.module';
import { ExamSchedulesModule } from './exam-schedules/exam-schedules.module';
import { LibraryModule } from './library/library.module';
import { ProvisioningModule } from './provisioning/provisioning.module';
import { InvitesModule } from './invites/invites.module';
import { SchoolsModule } from './schools/schools.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    PermissionsModule,
    CommonModule,
    SubscriptionsModule,
    SchoolsModule,
    UsersModule,
    GradesModule,
    StudentsModule,
    TeachersModule,
    FayedaModule,
    InvitesModule,
    AuthModule,
    DashboardsModule,
    AttendanceModule,
    ResultsModule,
    TimetableModule,
    ExamSchedulesModule,
    ClassworkModule,
    LibraryModule,
    ProvisioningModule,
    AnnouncementsModule,
    NotificationsModule,
    FinanceModule,
    PlatformModule,
    PaymentsModule,
    AiModule,
    AdmissionsModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
