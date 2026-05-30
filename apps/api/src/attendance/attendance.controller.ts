import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles('teacher', 'admin')
  markAttendance(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.mark(dto, user.schoolId, user.id);
  }

  @Get('student')
  @Roles('student', 'parent', 'teacher', 'admin')
  getStudentAttendance(
    @Query('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const requestedStudentId = user.role === 'student' ? user.id : studentId;
    return this.attendanceService.listByStudent(
      requestedStudentId,
      user.schoolId,
    );
  }
}
