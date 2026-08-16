import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { PlatformPermissionsGuard } from './guards/platform-permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { SchoolTenantGuard } from './guards/school-tenant.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    SchoolTenantGuard,
    RolesGuard,
    PermissionsGuard,
    PlatformPermissionsGuard,
  ],
  exports: [
    SchoolTenantGuard,
    RolesGuard,
    PermissionsGuard,
    PlatformPermissionsGuard,
  ],
})
export class CommonModule {}
