import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersService } from './users.service';

@Module({
  imports: [PermissionsModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
