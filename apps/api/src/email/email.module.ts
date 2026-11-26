import { Global, Module } from '@nestjs/common';
import { EmailAdminController } from './email-admin.controller';
import { EmailPreferencesService } from './email-preferences.service';
import {
  ParentEmailPreferenceController,
  SchoolEmailPreferenceController,
} from './email-preferences.controller';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';

@Global()
@Module({
  controllers: [
    EmailAdminController,
    SchoolEmailPreferenceController,
    ParentEmailPreferenceController,
  ],
  providers: [EmailPreferencesService, EmailService, EmailWorker],
  exports: [EmailService, EmailPreferencesService],
})
export class EmailModule {}
