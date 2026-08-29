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
import { PlatformInvoiceStatus, PlatformRole, SupportTicketStatus } from '@prisma/client';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import type { PlatformAuthUser } from '../common/auth.types';
import { PlatformGuard } from '../common/guards/platform.guard';
import { PlatformPermissionsGuard } from '../common/guards/platform-permissions.guard';
import { RequirePlatformPermissions } from '../common/decorators/require-platform-permissions.decorator';
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
  UpdatePlatformOperatorRoleDto,
  UpdatePlatformRoleGrantsDto,
  CreatePlatformOperatorDto,
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateSettings(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.platformSettings.updateSettings(dto, user.role);
  }

  @Get('access-control')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  getAccessControl() {
    return this.platformAccess.getAccessControl();
  }

  @Patch('access-control/roles')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateAccessRoles(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: UpdatePlatformRoleGrantsDto,
  ) {
    return this.platformAccess.updateRoleGrants(user.role, dto);
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

  @Post('access-control/operators')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createOperator(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: CreatePlatformOperatorDto,
  ) {
    return this.platformAccess.createOperator(user.role, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  dashboard() {
    return this.platformService.getDashboard();
  }

  @Get('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listSchools() {
    return this.platformService.listSchools();
  }

  @Get('schools/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  schoolDetail(@Param('id') id: string) {
    return this.platformService.getSchoolDetail(id);
  }

  @Get('curriculum-packages')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listCurriculumPackages() {
    return this.platformService.listCurriculumPackages();
  }

  @Get('curriculum-packages/:key')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  getCurriculumPackage(@Param('key') key: string) {
    return this.platformService.getCurriculumPackage(key);
  }

  @Patch('curriculum-packages/:key')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateCurriculumPackage(
    @Param('key') key: string,
    @Body() dto: UpdateCurriculumPackageDto,
  ) {
    return this.curriculumAdmin.updatePackage(key, dto);
  }

  @Post('curriculum-packages/:key/subjects')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  addPackageSubject(
    @Param('key') key: string,
    @Body() dto: AddPackageSubjectDto,
  ) {
    return this.curriculumAdmin.addSubjectToPackage(key, dto);
  }

  @Post('curriculum-packages/:key/subjects/:packageSubjectId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  removePackageSubject(
    @Param('key') key: string,
    @Param('packageSubjectId') packageSubjectId: string,
  ) {
    return this.curriculumAdmin.removeSubjectFromPackage(key, packageSubjectId);
  }

  @Post('curriculum-packages/:key/library')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  addPackageLibraryItem(
    @Param('key') key: string,
    @Body() dto: AddPackageLibraryItemDto,
  ) {
    return this.curriculumAdmin.addLibraryItemToPackage(key, dto);
  }

  @Post('curriculum-packages/:key/library/:packageLibraryItemId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  addPackageTemplate(
    @Param('key') key: string,
    @Body() dto: AddPackageTemplateDto,
  ) {
    return this.curriculumAdmin.addTemplateToPackage(key, dto);
  }

  @Patch('curriculum-packages/:key/templates/:packageTemplateId')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePackageTemplate(
    @Param('key') key: string,
    @Param('packageTemplateId') packageTemplateId: string,
    @Body() dto: UpdatePackageTemplateDto,
  ) {
    return this.curriculumAdmin.updatePackageTemplate(key, packageTemplateId, dto);
  }

  @Post('curriculum-packages/:key/templates/:packageTemplateId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  removePackageTemplate(
    @Param('key') key: string,
    @Param('packageTemplateId') packageTemplateId: string,
  ) {
    return this.curriculumAdmin.removeTemplateFromPackage(key, packageTemplateId);
  }

  @Post('curriculum-packages/:key/departments')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  addPackageDepartment(
    @Param('key') key: string,
    @Body() dto: CreatePackageDepartmentDto,
  ) {
    return this.curriculumAdmin.addDepartmentToPackage(key, dto);
  }

  @Patch('curriculum-packages/:key/departments/:departmentId')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePackageDepartment(
    @Param('key') key: string,
    @Param('departmentId') departmentId: string,
    @Body() dto: UpdatePackageDepartmentDto,
  ) {
    return this.curriculumAdmin.updatePackageDepartment(key, departmentId, dto);
  }

  @Post('curriculum-packages/:key/departments/:departmentId/remove')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  removePackageDepartment(
    @Param('key') key: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.curriculumAdmin.removeDepartmentFromPackage(key, departmentId);
  }

  @Post('catalog/sync')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  syncCatalog() {
    return this.curriculumAdmin.syncCatalogFromCode();
  }

  @Get('subjects')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlatformSubjects(@Query('includeArchived') includeArchived?: string) {
    return this.platformSubjectsService.list(includeArchived === 'true');
  }

  @Get('subjects/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  getPlatformSubject(@Param('id') id: string) {
    return this.platformSubjectsService.getById(id);
  }

  @Post('subjects')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createPlatformSubject(@Body() dto: CreatePlatformSubjectDto) {
    return this.platformSubjectsService.create(dto);
  }

  @Patch('subjects/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePlatformSubject(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformSubjectDto,
  ) {
    return this.platformSubjectsService.update(id, dto);
  }

  @Post('subjects/:id/archive')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  archivePlatformSubject(@Param('id') id: string) {
    return this.platformSubjectsService.archive(id);
  }

  @Post('subjects/sync')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  syncPlatformSubjects() {
    return this.platformSubjectsService.syncFromPackageDefinitions();
  }

  @Get('provisioning-logs')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  syncPlatformContent() {
    return this.platformContent.syncAll();
  }

  @Get('academic-structures')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listAcademicStructures(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listStructures(includeArchived === 'true');
  }

  @Post('academic-structures')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createAcademicStructure(@Body() dto: CreatePlatformStructureDto) {
    return this.platformContent.createStructure(dto);
  }

  @Patch('academic-structures/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateAcademicStructure(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformStructureDto,
  ) {
    return this.platformContent.updateStructure(id, dto);
  }

  @Delete('academic-structures/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  deleteAcademicStructure(@Param('id') id: string) {
    return this.platformContent.deleteStructure(id);
  }

  @Get('library/categories')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlatformLibraryCategories() {
    return this.platformContent.listLibraryCategories();
  }

  @Get('library/resources')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlatformLibraryResources(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listLibraryResources(includeArchived === 'true');
  }

  @Post('library/resources')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createPlatformLibraryResource(@Body() dto: CreatePlatformLibraryResourceDto) {
    return this.platformContent.createLibraryResource(dto);
  }

  @Patch('library/resources/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePlatformLibraryResource(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformLibraryResourceDto,
  ) {
    return this.platformContent.updateLibraryResource(id, dto);
  }

  @Post('library/resources/:id/archive')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  archivePlatformLibraryResource(@Param('id') id: string) {
    return this.platformContent.archiveLibraryResource(id);
  }

  @Delete('library/resources/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  deletePlatformLibraryResource(@Param('id') id: string) {
    return this.platformContent.deleteLibraryResource(id);
  }

  @Post('library/upload')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlatformMessageTemplates(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listMessageTemplates(includeArchived === 'true');
  }

  @Post('message-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createPlatformMessageTemplate(@Body() dto: CreatePlatformMessageTemplateDto) {
    return this.platformContent.createMessageTemplate(dto);
  }

  @Patch('message-templates/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePlatformMessageTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformMessageTemplateDto,
  ) {
    return this.platformContent.updateMessageTemplate(id, dto);
  }

  @Post('message-templates/:id/archive')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  archivePlatformMessageTemplate(@Param('id') id: string) {
    return this.platformContent.archiveMessageTemplate(id);
  }

  @Get('assessment-templates/catalog')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlatformAssessmentCatalog(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listAssessmentTemplates(includeArchived === 'true');
  }

  @Get('assessment-templates/catalog/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createSchool(@Body() dto: CreateTenantSchoolDto) {
    return this.platformService.createTenantSchool(dto);
  }

  @Post('schools/:id/provision')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSchoolStatusDto) {
    return this.platformService.updateSchoolStatus(id, dto.status);
  }

  @Delete('schools/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  deleteSchool(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
  ) {
    return this.platformService.deleteTenantSchool(id, user.role);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlans() {
    return this.platformService.listPlanCatalog();
  }

  @Patch('plans/:plan')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePlan(@Param('plan') plan: string, @Body() dto: UpdatePlanCatalogDto) {
    return this.platformService.updatePlanCatalog(plan, dto);
  }

  @Patch('schools/:id/plan')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateSchoolPlan(@Param('id') id: string, @Body() dto: UpdateSchoolPlanDto) {
    return this.platformService.updateSchoolPlan(id, dto);
  }

  @Get('schools/:id/assessment-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listSchoolAssessmentTemplates(@Param('id') id: string) {
    return this.assessmentTemplatesService.list(id);
  }

  @Post('schools/:id/assessment-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createSchoolAssessmentTemplate(
    @Param('id') id: string,
    @Body() dto: CreateAssessmentTemplateDto,
  ) {
    return this.assessmentTemplatesService.create(id, dto);
  }

  @Patch('schools/:id/assessment-templates/:templateId')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateSchoolAssessmentTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateAssessmentTemplateDto,
  ) {
    return this.assessmentTemplatesService.update(id, templateId, dto);
  }

  @Post('schools/:id/assessment-templates/:templateId/delete')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listUsage() {
    return this.platformBillingService.listUsage();
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard, PlatformGuard)
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
