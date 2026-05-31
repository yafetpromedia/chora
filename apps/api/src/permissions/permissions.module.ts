import { Global, Module } from '@nestjs/common';
import { RoleTemplatesController } from './role-templates.controller';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  controllers: [RoleTemplatesController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
