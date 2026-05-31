import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendFayedaCodeDto } from './dto/send-fayeda-code.dto';
import { VerifyFayedaCodeDto } from './dto/verify-fayeda-code.dto';
import { FayedaService } from './fayeda.service';

@Controller('schools/fayeda')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
@Roles('admin')
export class FayedaController {
  constructor(private readonly fayedaService: FayedaService) {}

  @Post('send-code')
  sendCode(@CurrentUser() user: AuthUser, @Body() dto: SendFayedaCodeDto) {
    return this.fayedaService.sendCode(user.schoolId, dto.identifier.trim());
  }

  @Post('verify')
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyFayedaCodeDto) {
    return this.fayedaService.verifyCode(
      user.schoolId,
      dto.sessionId,
      dto.code,
    );
  }
}
