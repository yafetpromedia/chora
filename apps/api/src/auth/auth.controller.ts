import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth.types';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JoinInviteDto } from './dto/join-invite.dto';
import { JoinSchoolDto } from './dto/join-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-school')
  registerSchool(@Body() dto: RegisterSchoolDto) {
    return this.authService.registerSchool(dto);
  }

  @Post('join-school')
  joinSchool(@Body() dto: JoinSchoolDto) {
    return this.authService.joinSchool(dto);
  }

  @Post('join-invite')
  joinInvite(@Body() dto: JoinInviteDto) {
    return this.authService.joinInvite(dto);
  }

  @Post('google')
  google(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard)
  profile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard)
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user, dto);
  }
}
