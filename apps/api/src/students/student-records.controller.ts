import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import {
  CreateBehaviorRecordDto,
  IssueCertificateDto,
  UpdateHealthRecordDto,
  UpdateStudentStatusDto,
  UploadStudentDocumentDto,
} from './dto/student-records.dto';
import { StudentRecordsService } from './student-records.service';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { assertSafeUploadedFilename } from '../common/validators/safe-filename';

type UploadedDocFile = { buffer: Buffer; originalname: string };

@Controller('schools/students')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'staff')
@RequirePermissions(SchoolPermission.STUDENTS_READ)
export class StudentRecordsController {
  constructor(private readonly records: StudentRecordsService) {}

  @Get(':id/records/summary')
  summary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.getSummary(user.schoolId, id);
  }

  @Get(':id/records/enrollments')
  enrollments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.getEnrollmentHistory(user.schoolId, id);
  }

  @Get(':id/records/transcript')
  transcript(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.buildTranscript(user.schoolId, id);
  }

  @Get(':id/records/transcript/html')
  @Header('Content-Type', 'text/html')
  async transcriptHtml(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.records.buildTranscript(user.schoolId, id);
    res.send(this.records.buildTranscriptHtml(data));
  }

  @Get(':id/records/attendance')
  attendance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.getAttendanceHistory(user.schoolId, id);
  }

  @Get(':id/records/documents')
  listDocuments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.listDocuments(user.schoolId, id);
  }

  @Post(':id/records/documents')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UploadStudentDocumentDto,
    @UploadedFile() file: UploadedDocFile | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Upload a file');
    }
    return this.records.uploadDocument(
      user.schoolId,
      id,
      user.id,
      dto.type,
      dto.title,
      file,
    );
  }

  @Delete(':id/records/documents/:documentId')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  deleteDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.records.deleteDocument(user.schoolId, id, documentId);
  }

  @Get(':id/records/behavior')
  listBehavior(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.listBehavior(user.schoolId, id);
  }

  @Post(':id/records/behavior')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  createBehavior(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateBehaviorRecordDto,
  ) {
    return this.records.createBehavior(user.schoolId, id, user.id, dto);
  }

  @Get(':id/records/health')
  getHealth(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.getHealth(user.schoolId, id);
  }

  @Patch(':id/records/health')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  updateHealth(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHealthRecordDto,
  ) {
    return this.records.upsertHealth(user.schoolId, id, dto);
  }

  @Get(':id/records/certificates')
  listCertificates(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.listCertificates(user.schoolId, id);
  }

  @Post(':id/records/certificates')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  issueCertificate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: IssueCertificateDto,
  ) {
    return this.records.issueCertificate(user.schoolId, id, user.id, dto);
  }

  @Get(':id/records/certificates/:certificateId/html')
  @Header('Content-Type', 'text/html')
  async certificateHtml(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('certificateId') certificateId: string,
    @Res() res: Response,
  ) {
    const html = await this.records.getCertificateHtml(
      user.schoolId,
      id,
      certificateId,
    );
    res.send(html);
  }

  @Get(':id/records/graduation/preview')
  graduationPreview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.previewGraduation(user.schoolId, id);
  }

  @Post(':id/records/graduation')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  graduate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.executeGraduation(user.schoolId, id, user.id);
  }

  @Patch(':id/records/status')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
  ) {
    return this.records.updateStatus(user.schoolId, id, dto);
  }

  @Get('files/:schoolId/:studentProfileId/:filename')
  async serveFile(
    @CurrentUser() user: AuthUser,
    @Param('schoolId') schoolId: string,
    @Param('studentProfileId') studentProfileId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    let safeName: string;
    try {
      safeName = assertSafeUploadedFilename(filename);
    } catch {
      res.status(400).send('Invalid filename');
      return;
    }
    await this.records.assertStudentFileAccess(user.schoolId, studentProfileId);
    if (schoolId !== user.schoolId) {
      res.status(404).send('Not found');
      return;
    }
    const path = join(
      process.cwd(),
      'uploads',
      'student-documents',
      schoolId,
      studentProfileId,
      safeName,
    );
    if (!existsSync(path)) {
      res.status(404).send('Not found');
      return;
    }
    createReadStream(path).pipe(res);
  }
}
