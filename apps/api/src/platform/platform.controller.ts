import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformInvoiceStatus } from '@prisma/client';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import type { PlatformAuthUser } from '../common/auth.types';
import { PlatformGuard } from '../common/guards/platform.guard';
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
import { PlatformAuthService } from './platform-auth.service';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformService } from './platform.service';
import { AssessmentTemplatesService } from '../results/assessment-templates.service';
import { CreateAssessmentTemplateDto } from '../results/dto/create-assessment-template.dto';
import { UpdateAssessmentTemplateDto } from '../results/dto/update-assessment-template.dto';
import {
  AddPackageSubjectDto,
  CreatePlatformSubjectDto,
  UpdateCurriculumPackageDto,
  UpdatePlatformSubjectDto,
} from './dto/platform-subject.dto';
import { PlatformContentService } from './platform-content.service';
import { PlatformCurriculumAdminService } from './platform-curriculum-admin.service';
import { PlatformSubjectsService } from './platform-subjects.service';

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

  @Get('message-templates')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlatformMessageTemplates(@Query('includeArchived') includeArchived?: string) {
    return this.platformContent.listMessageTemplates(includeArchived === 'true');
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
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createInvoice(@Body() dto: CreatePlatformInvoiceDto) {
    return this.platformBillingService.createInvoice(dto);
  }

  @Patch('invoices/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateInvoice(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.platformBillingService.updateInvoice(id, dto);
  }
}
