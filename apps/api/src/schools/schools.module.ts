import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { InvitesService } from './invites.service';
import { SchoolsService } from './schools.service';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, InvitesService],
  exports: [SchoolsService, InvitesService],
})
export class SchoolsModule {}
