import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { SchoolTenantGuard } from './guards/school-tenant.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SchoolTenantGuard, RolesGuard, PermissionsGuard],
  exports: [SchoolTenantGuard, RolesGuard, PermissionsGuard],
})
export class CommonModule {}
