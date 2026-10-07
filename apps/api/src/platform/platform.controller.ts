import {
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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { PlatformInvoiceStatus, PlatformPaymentProofStatus, PlatformRole, SupportTicketStatus } from '@prisma/client';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import type { PlatformAuthUser } from '../common/auth.types';
import { PlatformGuard } from '../common/guards/platform.guard';
import { PlatformPermissionsGuard } from '../common/guards/platform-permissions.guard';
import { RequirePlatformPermissions, RequirePlatformOwner } from '../common/decorators/require-platform-permissions.decorator';
import { PlatformPermission } from '../common/permissions/platform-permissions';
import { CreateTenantSchoolDto } from './dto/create-tenant-school.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import {
  UpdatePlanCatalogDto,
  UpdateSchoolPlanDto,
} from './dto/update-plan-catalog.dto';
import {
  CreatePlatformInvoiceDto,
  UpdatePlatformInvoiceDto,
} from './dto/platform-invoice.dto';
import { UpdateSupportTicketDto } from '../support/dto/update-support-ticket.dto';
import { CouponsService } from '../subscriptions/coupons.service';
import { CreateCouponDto, UpdateCouponDto } from '../subscriptions/dto/coupon.dto';
import { ReviewPlatformPaymentDto } from '../subscriptions/dto/platform-payment.dto';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformService } from './platform.service';
import { AssessmentTemplatesService } from '../results/assessment-templates.service';
import { CreateAssessmentTemplateDto } from '../results/dto/create-assessment-template.dto';
import { UpdateAssessmentTemplateDto } from '../results/dto/update-assessment-template.dto';
import {
  CreatePackageDepartmentDto,
  UpdatePackageDepartmentDto,
} from './dto/platform-department.dto';
import {
  AddPackageLibraryItemDto,
  CreatePlatformLibraryResourceDto,
  UpdatePlatformLibraryResourceDto,
} from './dto/platform-library.dto';
import {
  CreatePlatformStructureDto,
  UpdatePlatformStructureDto,
} from './dto/platform-structure.dto';
import {
  AddPackageTemplateDto,
  CreatePlatformMessageTemplateDto,
  UpdatePlatformMessageTemplateDto,
  UpdatePackageTemplateDto,
} from './dto/platform-template.dto';
import {
  AddPackageSubjectDto,
  CreatePlatformSubjectDto,
  UpdateCurriculumPackageDto,
  UpdatePlatformSubjectDto,
} from './dto/platform-subject.dto';
import { PlatformContentService } from './platform-content.service';
import { PlatformCurriculumAdminService } from './platform-curriculum-admin.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSubjectsService } from './platform-subjects.service';
import { PlatformAccessService } from './platform-access.service';
import { SupportService } from '../support/support.service';
import {
  AcceptPlatformInviteDto,
  CreatePlatformOperatorDto,
  InvitePlatformOperatorDto,
  SetPlatformOperatorActiveDto,
  UpdatePlatformOperatorRoleDto,
  UpdatePlatformRoleGrantsDto,
} from './dto/platform-access.dto';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformAuthService: PlatformAuthService,
    private readonly platformService: PlatformService,
    private readonly platformBillingService: PlatformBillingService,
    private readonly assessmentTemplatesService: AssessmentTemplatesService,
    private readonly platformSubjectsService: PlatformSubjectsService,
    private readonly curriculumAdmin: PlatformCurriculumAdminService,
    private readonly platformContent: PlatformContentService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly platformAccess: PlatformAccessService,
    private readonly supportService: SupportService,
    private readonly couponsService: CouponsService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformAuthService.login(dto.email, dto.password);
  }

  @Get('auth/invite/:token')
  getInvite(@Param('token') token: string) {
    return this.platformAccess.getInvitePreview(token);
  }

  @Post('auth/invite/:token/accept')
  acceptInvite(
    @Param('token') token: string,
    @Body() dto: AcceptPlatformInviteDto,
  ) {
    return this.platformAccess.acceptInvite(token, dto.password);
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

  @Get('settings')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  getSettings() {
    return this.platformSettings.getSettings();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updateSettings(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.platformSettings.updateSettings(dto, user.role);
  }

  @Post('settings/demo-video')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 250 * 1024 * 1024 } }),
  )
  uploadDemoVideo(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @UploadedFile()
    file: { originalname: string; buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Upload a video file');
    }
    return this.platformSettings.saveDemoVideoFile(file, user.role);
  }

  /** Public file for the marketing demo player (no auth). */
  @Get('demo/files/:filename')
  streamDemoVideo(@Param('filename') filename: string, @Res() res: Response) {
    const path = this.platformSettings.getDemoVideoFilePath(filename);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    const lower = filename.toLowerCase();
    if (lower.endsWith('.webm')) res.type('video/webm');
    else if (lower.endsWith('.mov')) res.type('video/quicktime');
    else res.type('video/mp4');
    createReadStream(path).pipe(res);
  }

  @Get('access-control')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  getAccessControl() {
    return this.platformAccess.getAccessControl();
  }

  @Get('access-control/audit')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listAccessAudit(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 50;
    return this.platformAccess.listAuditLogs(
      Number.isFinite(parsed) ? parsed : 50,
    );
  }

  @Patch('access-control/roles')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateAccessRoles(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: UpdatePlatformRoleGrantsDto,
  ) {
    return this.platformAccess.updateRoleGrants(user, dto);
  }

  @Patch('access-control/operators/:id/role')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateOperatorRole(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformOperatorRoleDto,
  ) {
    return this.platformAccess.updateOperatorRole(user, id, dto.role);
  }

  @Patch('access-control/operators/:id/active')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  setOperatorActive(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
    @Body() dto: SetPlatformOperatorActiveDto,
  ) {
    return this.platformAccess.setOperatorActive(user, id, dto.isActive);
  }

  @Post('access-control/operators')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createOperator(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: CreatePlatformOperatorDto,
  ) {
    return this.platformAccess.createOperator(user, dto);
  }

  @Post('access-control/operators/invite')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  inviteOperator(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: InvitePlatformOperatorDto,
  ) {
    return this.platformAccess.inviteOperator(user, dto);
  }

  @Post('access-control/operators/:id/resend-invite')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  resendInvite(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
  ) {
    return this.platformAccess.resendInvite(user, id);
  }

  @Delete('access-control/operators/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  deleteOperator(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
  ) {
    return this.platformAccess.deleteOperator(user, id);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_VIEW)
  dashboard() {
    return this.platformService.getDashboard();
  }

  @Get('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_VIEW)
  listSchools() {
    return this.platformService.listSchools();
  }

  @Get('schools/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_VIEW)
  schoolDetail(@Param('id') id: string) {
    return this.platformService.getSchoolDetail(id);
  }

  @Get('curriculum-packages')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listCurriculumPackages() {
    return this.platformService.listCurriculumPackages();
  }

  @Get('curriculum-packages/:key')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  getCurriculumPackage(@Param('key') key: string) {
    return this.platformService.getCurriculumPackage(key);
  }

  @Patch('curriculum-packages/:key')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updateCurriculumPackage(
    @Param('key') key: string,
    @Body() dto: UpdateCurriculumPackageDto,
  ) {
    return this.curriculumAdmin.updatePackage(key, dto);
  }

  @Post('curriculum-packages/:key/subjects')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  addPackageSubject(
    @Param('key') key: string,
    @Body() dto: AddPackageSubjectDto,
  ) {
    return this.curriculumAdmin.addSubjectToPackage(key, dto);
  }

  @Post('curriculum-packages/:key/subjects/:packageSubjectId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  removePackageSubject(
    @Param('key') key: string,
    @Param('packageSubjectId') packageSubjectId: string,
  ) {
    return this.curriculumAdmin.removeSubjectFromPackage(key, packageSubjectId);
  }

  @Post('curriculum-packages/:key/library')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  addPackageLibraryItem(
    @Param('key') key: string,
    @Body() dto: AddPackageLibraryItemDto,
  ) {
    return this.curriculumAdmin.addLibraryItemToPackage(key, dto);
  }

  @Post('curriculum-packages/:key/library/:packageLibraryItemId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  removePackageLibraryItem(
    @Param('key') key: string,
    @Param('packageLibraryItemId') packageLibraryItemId: string,
  ) {
    return this.curriculumAdmin.removeLibraryItemFromPackage(
      key,
      packageLibraryItemId,
    );
  }

  @Post('curriculum-packages/:key/templates')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  addPackageTemplate(
    @Param('key') key: string,
    @Body() dto: AddPackageTemplateDto,
  ) {
    return this.curriculumAdmin.addTemplateToPackage(key, dto);
  }

  @Patch('curriculum-packages/:key/templates/:packageTemplateId')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updatePackageTemplate(
    @Param('key') key: string,
    @Param('packageTemplateId') packageTemplateId: string,
    @Body() dto: UpdatePackageTemplateDto,
  ) {
    return this.curriculumAdmin.updatePackageTemplate(key, packageTemplateId, dto);
  }

  @Post('curriculum-packages/:key/templates/:packageTemplateId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  removePackageTemplate(
    @Param('key') key: string,
    @Param('packageTemplateId') packageTemplateId: string,
  ) {
    return this.curriculumAdmin.removeTemplateFromPackage(key, packageTemplateId);
  }

  @Post('curriculum-packages/:key/departments')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  addPackageDepartment(
    @Param('key') key: string,
    @Body() dto: CreatePackageDepartmentDto,
  ) {
    return this.curriculumAdmin.addDepartmentToPackage(key, dto);
  }

  @Patch('curriculum-packages/:key/departments/:departmentId')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updatePackageDepartment(
    @Param('key') key: string,
    @Param('departmentId') departmentId: string,
    @Body() dto: UpdatePackageDepartmentDto,
  ) {
    return this.curriculumAdmin.updatePackageDepartment(key, departmentId, dto);
  }

  @Post('curriculum-packages/:key/departments/:departmentId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  removePackageDepartment(
    @Param('key') key: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.curriculumAdmin.removeDepartmentFromPackage(key, departmentId);
  }

  @Post('catalog/sync')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  syncCatalog() {
    return this.curriculumAdmin.syncCatalogFromCode();
  }

  @Get('subjects')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listPlatformSubjects(@Query('includeArchived') includeArchived?: string) {
    return this.platformSubjectsService.list(includeArchived === 'true');
  }

  @Get('subjects/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  getPlatformSubject(@Param('id') id: string) {
    return this.platformSubjectsService.getById(id);
  }

  @Post('subjects')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  createPlatformSubject(@Body() dto: CreatePlatformSubjectDto) {
    return this.platformSubjectsService.create(dto);
  }

  @Patch('subjects/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updatePlatformSubject(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformSubjectDto,
  ) {
    return this.platformSubjectsService.update(id, dto);
  }

  @Post('subjects/:id/archive')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  archivePlatformSubject(@Param('id') id: string) {
    return this.platformSubjectsService.archive(id);
  }

  @Post('subjects/sync')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  syncPlatformSubjects() {
    return this.platformSubjectsService.syncFromPackageDefinitions();
  }

  @Get('provisioning-logs')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listProvisioningLogs(
    @Query('schoolId') schoolId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.curriculumAdmin.listProvisioningLogs(
      schoolId,
      limit ? Number(limit) : 50,
    );
  }

  @Post('content/sync')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  syncPlatformContent() {
    return this.platformContent.syncAll();
  }

  @Get('academic-structures')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listAcademicStructures(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listStructures(includeArchived === 'true');
  }

  @Post('academic-structures')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  createAcademicStructure(@Body() dto: CreatePlatformStructureDto) {
    return this.platformContent.createStructure(dto);
  }

  @Patch('academic-structures/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updateAcademicStructure(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformStructureDto,
  ) {
    return this.platformContent.updateStructure(id, dto);
  }

  @Delete('academic-structures/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  deleteAcademicStructure(@Param('id') id: string) {
    return this.platformContent.deleteStructure(id);
  }

  @Get('library/categories')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listPlatformLibraryCategories() {
    return this.platformContent.listLibraryCategories();
  }

  @Get('library/resources')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listPlatformLibraryResources(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listLibraryResources(includeArchived === 'true');
  }

  @Post('library/resources')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  createPlatformLibraryResource(@Body() dto: CreatePlatformLibraryResourceDto) {
    return this.platformContent.createLibraryResource(dto);
  }

  @Patch('library/resources/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updatePlatformLibraryResource(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformLibraryResourceDto,
  ) {
    return this.platformContent.updateLibraryResource(id, dto);
  }

  @Post('library/resources/:id/archive')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  archivePlatformLibraryResource(@Param('id') id: string) {
    return this.platformContent.archiveLibraryResource(id);
  }

  @Delete('library/resources/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  deletePlatformLibraryResource(@Param('id') id: string) {
    return this.platformContent.deleteLibraryResource(id);
  }

  @Post('library/upload')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  @UseInterceptors(FileInterceptor('file'))
  uploadPlatformLibraryFile(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Upload a file');
    }
    return this.platformContent.saveUploadedFile(file);
  }

  @Get('library/files/:filename')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  downloadPlatformLibraryFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const path = this.platformContent.getFilePath(filename);
    if (!existsSync(path)) {
      throw new BadRequestException('File not found');
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    createReadStream(path).pipe(res);
  }

  @Get('message-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listPlatformMessageTemplates(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listMessageTemplates(includeArchived === 'true');
  }

  @Post('message-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  createPlatformMessageTemplate(@Body() dto: CreatePlatformMessageTemplateDto) {
    return this.platformContent.createMessageTemplate(dto);
  }

  @Patch('message-templates/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updatePlatformMessageTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformMessageTemplateDto,
  ) {
    return this.platformContent.updateMessageTemplate(id, dto);
  }

  @Post('message-templates/:id/archive')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  archivePlatformMessageTemplate(@Param('id') id: string) {
    return this.platformContent.archiveMessageTemplate(id);
  }

  @Get('assessment-templates/catalog')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listPlatformAssessmentCatalog(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listAssessmentTemplates(includeArchived === 'true');
  }

  @Get('assessment-templates/catalog/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  getPlatformAssessmentCatalogItem(@Param('id') id: string) {
    return this.platformContent.getAssessmentTemplate(id);
  }

  @Post('schools/:id/copy-assessment-template/:platformTemplateId')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  copyAssessmentToSchool(
    @Param('id') schoolId: string,
    @Param('platformTemplateId') platformTemplateId: string,
  ) {
    return this.platformContent.copyAssessmentTemplateToSchool(
      schoolId,
      platformTemplateId,
    );
  }

  @Post('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_CREATE)
  createSchool(@Body() dto: CreateTenantSchoolDto) {
    return this.platformService.createTenantSchool(dto);
  }

  @Post('schools/:id/provision')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  reprovisionSchool(
    @Param('id') id: string,
    @Body() body: { curriculumPackageKey: string },
  ) {
    return this.platformService.reprovisionSchool(
      id,
      body.curriculumPackageKey,
    );
  }

  @Patch('schools/:id/status')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_SUSPEND)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSchoolStatusDto) {
    return this.platformService.updateSchoolStatus(id, dto.status);
  }

  @Delete('schools/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_DELETE)
  deleteSchool(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
  ) {
    return this.platformService.deleteTenantSchool(id, user.role);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  listPlans() {
    return this.platformService.listPlanCatalog();
  }

  @Patch('plans/:plan')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  updatePlan(@Param('plan') plan: string, @Body() dto: UpdatePlanCatalogDto) {
    return this.platformService.updatePlanCatalog(plan, dto);
  }

  @Patch('schools/:id/plan')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  updateSchoolPlan(@Param('id') id: string, @Body() dto: UpdateSchoolPlanDto) {
    return this.platformService.updateSchoolPlan(id, dto);
  }

  @Get('schools/:id/assessment-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  listSchoolAssessmentTemplates(@Param('id') id: string) {
    return this.assessmentTemplatesService.list(id);
  }

  @Post('schools/:id/assessment-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  createSchoolAssessmentTemplate(
    @Param('id') id: string,
    @Body() dto: CreateAssessmentTemplateDto,
  ) {
    return this.assessmentTemplatesService.create(id, dto);
  }

  @Patch('schools/:id/assessment-templates/:templateId')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  updateSchoolAssessmentTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateAssessmentTemplateDto,
  ) {
    return this.assessmentTemplatesService.update(id, templateId, dto);
  }

  @Post('schools/:id/assessment-templates/:templateId/delete')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformOwner()
  deleteSchoolAssessmentTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
  ) {
    return this.assessmentTemplatesService.remove(id, templateId);
  }

  @Get('billing/summary')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  billingSummary() {
    return this.platformBillingService.getBillingSummary();
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SCHOOLS_VIEW)
  listUsage() {
    return this.platformBillingService.listUsage();
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  listInvoices(
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: PlatformInvoiceStatus,
  ) {
    return this.platformBillingService.listInvoices({ schoolId, status });
  }

  @Post('invoices')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  createInvoice(@Body() dto: CreatePlatformInvoiceDto) {
    return this.platformBillingService.createInvoice(dto);
  }

  @Patch('invoices/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  updateInvoice(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.platformBillingService.updateInvoice(id, dto);
  }

  @Get('payment-proofs')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  listPaymentProofs(@Query('status') status?: PlatformPaymentProofStatus) {
    return this.platformBillingService.listPaymentProofs(status);
  }

  @Patch('payment-proofs/:id/review')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  reviewPaymentProof(
    @Param('id') id: string,
    @Body() dto: ReviewPlatformPaymentDto,
  ) {
    return this.platformBillingService.reviewPaymentProof(id, dto);
  }

  @Get('coupons')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listCoupons() {
    return this.couponsService.list();
  }

  @Post('coupons')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch('coupons/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.BILLING_MANAGE)
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Get('support-tickets')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SUPPORT_MANAGE)
  listSupportTickets(
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: SupportTicketStatus,
  ) {
    return this.supportService.listForPlatform({ schoolId, status });
  }

  @Get('support-tickets/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SUPPORT_MANAGE)
  getSupportTicket(@Param('id') id: string) {
    return this.supportService.getForPlatform(id);
  }

  @Patch('support-tickets/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
  @RequirePlatformPermissions(PlatformPermission.SUPPORT_MANAGE)
  updateSupportTicket(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.supportService.updateForPlatform(id, dto);
  }
}
