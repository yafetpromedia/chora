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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { LibraryResourceStatus, LibraryResourceType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { CreateLibraryResourceDto } from './dto/create-library-resource.dto';
import { UpdateLibraryResourceDto } from './dto/update-library-resource.dto';
import { UpdateReadingProgressDto } from './dto/update-reading-progress.dto';
import { LibraryService } from './library.service';

type UploadedLibFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

@Controller('schools/library')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('hub')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  hub(@CurrentUser() user: AuthUser) {
    return this.libraryService.getHub(user.schoolId, user.id, user.role);
  }

  @Get('resources')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('resourceType') resourceType?: LibraryResourceType,
    @Query('gradeId') gradeId?: string,
    @Query('status') status?: LibraryResourceStatus,
    @Query('limit') limit?: string,
  ) {
    return this.libraryService.listResources(user.schoolId, user.id, user.role, {
      q: q?.trim() || undefined,
      categoryId,
      resourceType,
      gradeId,
      status:
        user.role === 'admin' || user.role === 'staff' ? status : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('resources/:id')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.libraryService.getResource(user.schoolId, user.id, user.role, id);
  }

  @Post('resources')
  @Roles('admin', 'staff', 'teacher')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLibraryResourceDto) {
    return this.libraryService.createResource(
      user.schoolId,
      user.id,
      user.role,
      dto,
    );
  }

  @Patch('resources/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.LIBRARY_MANAGE)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLibraryResourceDto,
  ) {
    return this.libraryService.updateResource(user.schoolId, id, dto);
  }

  @Post('resources/:id/publish')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.LIBRARY_MANAGE)
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.libraryService.publishResource(user.schoolId, id);
  }

  @Delete('resources/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.LIBRARY_MANAGE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.libraryService.deleteResource(user.schoolId, id);
  }

  @Post('upload')
  @Roles('admin', 'staff', 'teacher')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedLibFile | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Upload a file');
    }
    return this.libraryService.saveUploadedFile(user.schoolId, file);
  }

  @Get('files/:schoolId/:filename')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param('schoolId') schoolId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (schoolId !== user.schoolId) {
      throw new BadRequestException('Invalid school');
    }
    const path = await this.libraryService.getFilePath(schoolId, filename);
    if (!existsSync(path)) {
      throw new BadRequestException('File not found');
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    createReadStream(path).pipe(res);
  }

  @Post('resources/:id/download')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  recordDownload(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.libraryService.recordDownload(user.schoolId, id);
  }

  @Post('resources/:id/favorite')
  @Roles('student')
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.libraryService.toggleFavorite(user.schoolId, user.id, id);
  }

  @Patch('resources/:id/progress')
  @Roles('student')
  progress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReadingProgressDto,
  ) {
    return this.libraryService.updateProgress(
      user.schoolId,
      user.id,
      id,
      dto,
    );
  }
}
