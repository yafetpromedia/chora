import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { SchoolsController } from './schools.controller';
import { InvitesService } from './invites.service';
import { SchoolsService } from './schools.service';

@Module({
  imports: [PermissionsModule, ProvisioningModule],
  controllers: [SchoolsController],
  providers: [SchoolsService, InvitesService],
  exports: [SchoolsService, InvitesService],
})
export class SchoolsModule {}
