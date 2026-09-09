import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { RequireSchoolModule } from '../common/decorators/require-school-module.decorator';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';
import {
  CreateClassworkDto,
  GradeSubmissionDto,
  SubmitClassworkDto,
  UpdateClassworkDto,
} from './dto/classwork.dto';
import { ClassworkService } from './classwork.service';

type UploadedFile = { buffer: Buffer; originalname: string };

@Controller('schools/classwork')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, SchoolModuleGuard)
@RequireSchoolModule('classroom')
export class ClassworkController {
  constructor(private readonly classwork: ClassworkService) {}

  @Get('class-subjects')
  @Roles('admin', 'staff', 'teacher')
  classSubjects(@CurrentUser() user: AuthUser) {
    return this.classwork.listTeacherClassSubjects(
      user.schoolId,
      user.id,
      user.role,
    );
  }

  @Get('assignments')
  @Roles('admin', 'staff', 'teacher')
  listTeacher(
    @CurrentUser() user: AuthUser,
    @Query('classSubjectId') classSubjectId?: string,
    @Query('type') type?: 'WORKSHEET' | 'ASSIGNMENT',
  ) {
    return this.classwork.listForTeacher(
      user.schoolId,
      user.id,
      user.role,
      classSubjectId,
      type,
    );
  }

  @Post('assignments')
  @Roles('admin', 'staff', 'teacher')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClassworkDto) {
    return this.classwork.create(user.schoolId, user.id, user.role, dto);
  }

  @Patch('assignments/:id')
  @Roles('admin', 'staff', 'teacher')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassworkDto,
  ) {
    return this.classwork.update(user.schoolId, user.id, user.role, id, dto);
  }

  @Post('assignments/:id/publish')
  @Roles('admin', 'staff', 'teacher')
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classwork.publish(user.schoolId, user.id, user.role, id);
  }

  @Post('assignments/:id/close')
  @Roles('admin', 'staff', 'teacher')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classwork.close(user.schoolId, user.id, user.role, id);
  }

  @Get('assignments/:id')
  @Roles('admin', 'staff', 'teacher')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classwork.getOneForTeacher(
      user.schoolId,
      user.id,
      user.role,
      id,
    );
  }

  @Get('assignments/:id/submissions')
  @Roles('admin', 'staff', 'teacher')
  submissions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classwork.listSubmissions(
      user.schoolId,
      user.id,
      user.role,
      id,
    );
  }

  @Patch('assignments/:assignmentId/submissions/:submissionId/grade')
  @Roles('admin', 'staff', 'teacher')
  gradeSubmission(
    @CurrentUser() user: AuthUser,
    @Param('assignmentId') assignmentId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.classwork.gradeSubmission(
      user.schoolId,
      user.id,
      user.role,
      assignmentId,
      submissionId,
      dto,
    );
  }

  @Post('assignments/:id/attachment')
  @Roles('admin', 'staff', 'teacher')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedFile,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File required');
    }
    return this.classwork.saveAssignmentFile(
      user.schoolId,
      user.id,
      user.role,
      id,
      file,
    );
  }

  @Get('student')
  @Roles('student')
  listStudent(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: 'WORKSHEET' | 'ASSIGNMENT',
  ) {
    return this.classwork.listForStudent(user.schoolId, user.id, type);
  }

  @Get('student/:id')
  @Roles('student')
  getStudent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classwork.getOneForStudent(user.schoolId, user.id, id);
  }

  @Post('student/:id/submit')
  @Roles('student')
  @UseInterceptors(FileInterceptor('file'))
  submitStudent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitClassworkDto,
    @UploadedFile() file?: UploadedFile,
  ) {
    return this.classwork.submitStudent(
      user.schoolId,
      user.id,
      id,
      dto.note,
      file?.buffer?.length ? file : undefined,
    );
  }

  @Get('files/:schoolId/:filename')
  @Roles('admin', 'staff', 'teacher', 'student')
  serveFile(
    @CurrentUser() user: AuthUser,
    @Param('schoolId') schoolId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (user.schoolId !== schoolId) {
      res.status(403).end();
      return;
    }
    const path = this.classwork.resolveFilePath(schoolId, filename);
    if (!existsSync(path)) {
      res.status(404).end();
      return;
    }
    createReadStream(path).pipe(res);
  }
}
