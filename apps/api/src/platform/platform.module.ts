import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { SchoolsModule } from '../schools/schools.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SupportModule } from '../support/support.module';
import { UsersModule } from '../users/users.module';
import { ResultsModule } from '../results/results.module';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAccessService } from './platform-access.service';
import { PlatformController } from './platform.controller';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformContentSyncService } from './platform-content-sync.service';
import { PlatformContentService } from './platform-content.service';
import { PlatformCurriculumAdminService } from './platform-curriculum-admin.service';
import { PlatformSubjectsService } from './platform-subjects.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: Number(
            configService.get<string>('JWT_EXPIRY_SECONDS', '3600'),
          ),
        },
      }),
    }),
    forwardRef(() => AuthModule),
    SchoolsModule,
    forwardRef(() => ProvisioningModule),
    UsersModule,
    SubscriptionsModule,
    ResultsModule,
    SupportModule,
  ],
  controllers: [PlatformController],
  providers: [
    PlatformAuthService,
    PlatformAccessService,
    PlatformService,
    PlatformBillingService,
    PlatformSubjectsService,
    PlatformCurriculumAdminService,
    PlatformContentSyncService,
    PlatformContentService,
    PlatformSettingsService,
  ],
  exports: [
    PlatformAuthService,
    PlatformAccessService,
    PlatformSubjectsService,
    PlatformContentService,
    PlatformContentSyncService,
    PlatformSettingsService,
  ],
})
export class PlatformModule {}
