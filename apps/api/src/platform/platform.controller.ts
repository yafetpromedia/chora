import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import type { PlatformAuthUser } from '../common/auth.types';
import { PlatformGuard } from '../common/guards/platform.guard';
import { CreateTenantSchoolDto } from './dto/create-tenant-school.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformAuthService: PlatformAuthService,
    private readonly platformService: PlatformService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformAuthService.login(dto.email, dto.password);
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  me(@CurrentPlatformUser() user: PlatformAuthUser) {
    return { user };
  }

  @Get('auth/profile')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  profile(@CurrentPlatformUser() user: PlatformAuthUser) {
    return this.platformAuthService.getProfile(user);
  }

  @Patch('auth/profile')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateProfile(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: UpdatePlatformProfileDto,
  ) {
    return this.platformAuthService.updateProfile(user, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  dashboard() {
    return this.platformService.getDashboard();
  }

  @Get('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listSchools() {
    return this.platformService.listSchools();
  }

  @Get('schools/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  schoolDetail(@Param('id') id: string) {
    return this.platformService.getSchoolDetail(id);
  }

  @Post('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createSchool(@Body() dto: CreateTenantSchoolDto) {
    return this.platformService.createTenantSchool(dto);
  }

  @Patch('schools/:id/status')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSchoolStatusDto) {
    return this.platformService.updateSchoolStatus(id, dto.status);
  }
}
