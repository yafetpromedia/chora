import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

type UploadedCsvFile = {
  buffer: Buffer;
  originalname?: string;
};

@Controller('schools/students')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'staff')
@RequirePermissions(SchoolPermission.STUDENTS_READ)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.studentsService.list(user.schoolId);
  }

  @Post()
  @RequirePermissions(SchoolPermission.STUDENTS_CREATE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(user.schoolId, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedCsvFile | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Upload a CSV file');
    }
    const rows = this.studentsService.parseCsv(file.buffer);
    return this.studentsService.importRows(user.schoolId, rows);
  }

  @Get(':id/card')
  @RequirePermissions(SchoolPermission.STUDENTS_CARDS)
  getCard(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studentsService.getIdCard(user.schoolId, id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studentsService.getOne(user.schoolId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(user.schoolId, id, dto);
  }

  @Post(':id/reset-portal-password')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  resetPortalPassword(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studentsService.resetPortalPassword(user.schoolId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studentsService.remove(user.schoolId, id);
  }
}
