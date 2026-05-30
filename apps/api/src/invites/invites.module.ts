import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module';
import { InvitesController } from './invites.controller';

@Module({
  imports: [SchoolsModule],
  controllers: [InvitesController],
})
export class InvitesModule {}
