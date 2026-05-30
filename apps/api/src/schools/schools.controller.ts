import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InvitesService } from './invites.service';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly invitesService: InvitesService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async me(@CurrentUser() user: AuthUser) {
    const school = await this.schoolsService.findById(user.schoolId);
    if (!school) {
      return { school: null };
    }
    return { school };
  }

  @Post('invites')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin')
  createInvite(@CurrentUser() user: AuthUser, @Body() dto: CreateInviteDto) {
    return this.invitesService.createInvite(user.schoolId, user.id, dto);
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin')
  listInvites(@CurrentUser() user: AuthUser) {
    return this.invitesService.listInvites(user.schoolId);
  }
}
