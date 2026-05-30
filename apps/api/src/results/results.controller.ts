import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UpsertResultDto } from './dto/upsert-result.dto';
import { ResultsService } from './results.service';

@Controller('results')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  @Roles('teacher', 'admin')
  upsertResult(@Body() dto: UpsertResultDto, @CurrentUser() user: AuthUser) {
    return this.resultsService.upsert(dto, user.schoolId, user.id);
  }

  @Get('student')
  @Roles('student', 'parent', 'teacher', 'admin')
  getStudentResults(
    @Query('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const requestedStudentId = user.role === 'student' ? user.id : studentId;
    return this.resultsService.listByStudent(requestedStudentId, user.schoolId);
  }
}
