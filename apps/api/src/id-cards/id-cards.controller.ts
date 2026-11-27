import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { LookupIdCardDto } from './dto/lookup-id-card.dto';
import { IdCardsService } from './id-cards.service';

@Controller('id-cards')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class IdCardsController {
  constructor(private readonly idCards: IdCardsService) {}

  /** Identify a student or staff member from printed QR or barcode (no mark). */
  @Post('lookup')
  @Roles('admin', 'staff', 'teacher')
  lookup(@CurrentUser() user: AuthUser, @Body() dto: LookupIdCardDto) {
    return this.idCards.lookup(user.schoolId, dto.code);
  }
}
