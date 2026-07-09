import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ResultWorkflowStatus } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { AcademicEnrollmentService } from './academic-enrollment.service';
import { AcademicPromotionService } from './academic-promotion.service';
import { AcademicYearsService } from './academic-years.service';
import { AcademicsService } from './academics.service';
import { AssessmentTemplatesService } from './assessment-templates.service';
import { ResultWorkflowService } from './result-workflow.service';
import { CreateAcademicYearDto } from '../finance/dto/create-academic-year.dto';
import { AssignTemplateToClassSubjectDto, AssignTemplateToGradeDto } from './dto/assign-template.dto';
import { BulkScoresDto } from './dto/bulk-scores.dto';
import { CreateAssessmentTemplateDto } from './dto/create-assessment-template.dto';
import { UpdateAssessmentTemplateDto } from './dto/update-assessment-template.dto';
import { SaveScoreMatrixDto } from './dto/save-score-matrix.dto';
import { SaveStudentSubjectMatrixDto } from './dto/save-student-subject-matrix.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { UpsertResultDto } from './dto/upsert-result.dto';
import { UpsertTermReportDto } from './dto/upsert-term-report.dto';
import { ExecutePromotionDto } from './dto/execute-promotion.dto';
import { BulkWorkflowDto } from './dto/bulk-workflow.dto';
import { SetAssessmentEntryLockDto } from './dto/set-assessment-entry-lock.dto';
import { WorkflowNotesDto } from './dto/workflow-notes.dto';
import { ResultsService } from './results.service';

@Controller('results')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly academicsService: AcademicsService,
    private readonly templatesService: AssessmentTemplatesService,
    private readonly academicYearsService: AcademicYearsService,
    private readonly workflowService: ResultWorkflowService,
    private readonly promotionService: AcademicPromotionService,
    private readonly enrollmentService: AcademicEnrollmentService,
  ) {}

  @Get('promotion/preview')
  @Roles('admin', 'staff')
  promotionPreview(
    @CurrentUser() user: AuthUser,
    @Query('fromYearId') fromYearId: string,
  ) {
    return this.promotionService.getPreview(user.schoolId, fromYearId);
  }

  @Post('promotion/execute')
  @Roles('admin', 'staff')
  executePromotion(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExecutePromotionDto,
  ) {
    return this.promotionService.execute(user.schoolId, dto);
  }

  @Post('enrollments/sync')
  @Roles('admin', 'staff')
  syncEnrollments(@CurrentUser() user: AuthUser) {
    return this.enrollmentService.syncSchoolEnrollments(user.schoolId);
  }

  @Get('enrollments/student/:studentProfileId')
  @Roles('admin', 'staff', 'teacher')
  studentEnrollments(
    @CurrentUser() user: AuthUser,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.enrollmentService.listEnrollmentsForStudent(
      user.schoolId,
      studentProfileId,
    );
  }

  /** @deprecated legacy */
  @Post()
  @Roles('teacher', 'admin')
  upsertLegacy(
    @Body() dto: UpsertResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.resultsService.upsert(dto, user.schoolId, user.id);
  }

  /** @deprecated legacy */
  @Get('student')
  @Roles('student', 'parent', 'teacher', 'admin')
  async legacyStudent(
    @Query('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const id =
      user.role === 'student'
        ? user.id
        : studentId;
    return this.resultsService.listByStudent(id, user.schoolId);
  }

  @Get('student/scores')
  @Roles('student', 'parent')
  async studentReleasedScores(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId?: string,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    const profileId = await this.academicsService.resolveProfileId(
      user.role,
      user.id,
      user.schoolId,
      studentProfileId,
    );
    return this.academicsService.listStudentReleasedScores(
      user.schoolId,
      profileId,
      termId,
    );
  }

  @Get('student/report-card-status')
  @Roles('student', 'parent')
  async studentReportCardStatus(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    const profileId = await this.academicsService.resolveProfileId(
      user.role,
      user.id,
      user.schoolId,
      studentProfileId,
    );
    return this.academicsService.getReportCardAvailability(
      user.schoolId,
      profileId,
      termId,
      user.role,
    );
  }

  @Get('assessment-templates')
  @Roles('admin', 'staff', 'teacher')
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.templatesService.list(user.schoolId);
  }

  @Post('assessment-templates')
  @Roles('admin', 'staff')
  createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssessmentTemplateDto,
  ) {
    return this.templatesService.create(user.schoolId, dto);
  }

  @Get('assessment-templates/:id')
  @Roles('admin', 'staff', 'teacher')
  getTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.getById(user.schoolId, id);
  }

  @Patch('assessment-templates/:id')
  @Roles('admin', 'staff')
  updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentTemplateDto,
  ) {
    return this.templatesService.update(user.schoolId, id, dto);
  }

  @Post('assessment-templates/:id/delete')
  @Roles('admin', 'staff')
  deleteTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.remove(user.schoolId, id);
  }

  @Post('assessment-templates/:id/assign-grade')
  @Roles('admin', 'staff')
  assignTemplateGrade(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignTemplateToGradeDto,
  ) {
    return this.templatesService.assignToGrade(
      user.schoolId,
      id,
      dto.gradeId,
      dto.subjectId,
    );
  }

  @Post('class-subjects/:classSubjectId/template')
  @Roles('admin', 'staff')
  assignClassSubjectTemplate(
    @CurrentUser() user: AuthUser,
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: AssignTemplateToClassSubjectDto,
  ) {
    return this.templatesService.assignToClassSubject(
      user.schoolId,
      classSubjectId,
      dto.templateId,
    );
  }

  @Post('sync-assessments')
  @Roles('admin', 'staff', 'teacher')
  syncAssessments(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId: string,
  ) {
    return this.templatesService.syncTermAssessments(
      user.schoolId,
      termId,
      classSubjectId,
    );
  }

  @Get('score-matrix')
  @Roles('admin', 'staff', 'teacher')
  scoreMatrix(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId: string,
  ) {
    return this.templatesService.getScoreMatrix(
      user.schoolId,
      termId,
      classSubjectId,
      user.id,
      user.role,
    );
  }

  @Patch('assessments/:id/entry-lock')
  @Roles('admin', 'staff')
  setAssessmentEntryLock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetAssessmentEntryLockDto,
  ) {
    return this.templatesService.setAssessmentEntryLock(
      user.schoolId,
      id,
      dto.entryLocked,
    );
  }

  @Post('score-matrix')
  @Roles('admin', 'staff', 'teacher')
  saveScoreMatrix(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveScoreMatrixDto,
  ) {
    return this.templatesService.saveScoreMatrix(
      user.schoolId,
      dto.termId,
      dto.classSubjectId,
      dto.entries,
      user.id,
      user.role,
    );
  }

  @Get('student-subject-matrix')
  @Roles('admin', 'staff', 'teacher', 'student', 'parent')
  async studentSubjectMatrix(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    const profileId = await this.academicsService.resolveProfileId(
      user.role,
      user.id,
      user.schoolId,
      studentProfileId,
    );
    return this.templatesService.getStudentSubjectMatrix(
      user.schoolId,
      termId,
      profileId,
      user.id,
      user.role,
    );
  }

  @Post('student-subject-matrix')
  @Roles('admin', 'staff', 'teacher')
  saveStudentSubjectMatrix(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveStudentSubjectMatrixDto,
  ) {
    return this.templatesService.saveStudentSubjectMatrix(
      user.schoolId,
      dto.termId,
      dto.studentProfileId,
      dto.entries,
      user.id,
      user.role,
    );
  }

  @Get('academic-years')
  @Roles('admin', 'staff', 'teacher')
  listAcademicYears(@CurrentUser() user: AuthUser) {
    return this.academicYearsService.list(user.schoolId);
  }

  @Get('academic-years/current')
  @Roles('admin', 'staff', 'teacher')
  async currentAcademicYear(@CurrentUser() user: AuthUser) {
    const year = await this.academicYearsService.getCurrent(user.schoolId);
    return { year: year ?? null };
  }

  @Post('academic-years/ensure-current')
  @Roles('admin', 'staff')
  async ensureCurrentAcademicYear(@CurrentUser() user: AuthUser) {
    const year = await this.academicYearsService.ensureCurrentYear(user.schoolId);
    return { year };
  }

  @Post('academic-years')
  @Roles('admin', 'staff')
  createAcademicYear(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.academicYearsService.create(user.schoolId, dto);
  }

  @Post('academic-years/:id/set-current')
  @Roles('admin', 'staff')
  setCurrentAcademicYear(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.academicYearsService.setCurrent(user.schoolId, id);
  }

  @Get('terms')
  @Roles('admin', 'teacher', 'student', 'parent')
  listTerms(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.academicsService.listTerms(user.schoolId, academicYearId);
  }

  @Post('terms')
  @Roles('admin')
  createTerm(@CurrentUser() user: AuthUser, @Body() dto: CreateTermDto) {
    return this.academicsService.createTerm(user.schoolId, dto);
  }

  @Patch('terms/:id')
  @Roles('admin')
  updateTerm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
  ) {
    return this.academicsService.updateTerm(user.schoolId, id, dto);
  }

  @Delete('terms/:id')
  @Roles('admin')
  deleteTerm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.academicsService.deleteTerm(user.schoolId, id);
  }

  @Get('subjects')
  @Roles('admin', 'teacher')
  listSubjects(@CurrentUser() user: AuthUser) {
    return this.academicsService.listSubjects(user.schoolId);
  }

  @Post('subjects')
  @Roles('admin')
  createSubject(@CurrentUser() user: AuthUser, @Body() dto: CreateSubjectDto) {
    return this.academicsService.createSubject(user.schoolId, dto);
  }

  @Patch('subjects/:id')
  @Roles('admin', 'staff')
  updateSubject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { name?: string },
  ) {
    return this.academicsService.updateSubject(user.schoolId, id, dto);
  }

  @Get('class-subjects')
  @Roles('admin', 'teacher')
  listClassSubjects(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.academicsService.listClassSubjects(
      user.schoolId,
      academicYearId,
      user.id,
      user.role,
    );
  }

  @Post('class-subjects')
  @Roles('admin')
  createClassSubject(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateClassSubjectDto,
  ) {
    return this.academicsService.createClassSubject(user.schoolId, dto);
  }

  @Get('class-subjects/by-grade')
  @Roles('admin', 'staff')
  listClassSubjectsByGrade(
    @CurrentUser() user: AuthUser,
    @Query('gradeId') gradeId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.academicsService.listClassSubjectsByGrade(
      user.schoolId,
      gradeId,
      sectionId,
    );
  }

  @Patch('class-subjects/:id')
  @Roles('admin', 'staff')
  updateClassSubject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassSubjectDto,
  ) {
    return this.academicsService.updateClassSubject(user.schoolId, id, dto);
  }

  @Get('workflow/pending')
  @Roles('admin', 'staff')
  listPendingWorkflow(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ResultWorkflowStatus,
    @Query('termId') termId?: string,
  ) {
    return this.workflowService.listPending(user.schoolId, status, termId);
  }

  @Post('workflow/submit')
  @Roles('admin', 'staff', 'teacher')
  submitWorkflow(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId: string,
  ) {
    return this.workflowService.submit(
      user.schoolId,
      termId,
      classSubjectId,
      user.id,
      user.role,
    );
  }

  @Post('workflow/approve-bulk')
  @Roles('admin', 'staff')
  approveWorkflowBulk(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkWorkflowDto,
  ) {
    return this.workflowService.approveBulk(
      user.schoolId,
      user.id,
      dto.termId,
      dto.sheetIds,
    );
  }

  @Post('workflow/publish-bulk')
  @Roles('admin', 'staff')
  publishWorkflowBulk(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkWorkflowDto,
  ) {
    return this.workflowService.publishBulk(
      user.schoolId,
      user.id,
      dto.termId,
      dto.sheetIds,
    );
  }

  @Post('workflow/approve')
  @Roles('admin', 'staff')
  approveWorkflow(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId: string,
    @Body() dto: WorkflowNotesDto,
  ) {
    return this.workflowService.approve(
      user.schoolId,
      termId,
      classSubjectId,
      user.id,
      dto.notes,
    );
  }

  @Post('workflow/publish')
  @Roles('admin', 'staff')
  publishWorkflow(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId: string,
  ) {
    return this.workflowService.publish(
      user.schoolId,
      termId,
      classSubjectId,
      user.id,
    );
  }

  @Post('workflow/reopen')
  @Roles('admin', 'staff')
  reopenWorkflow(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId: string,
  ) {
    return this.workflowService.reopen(user.schoolId, termId, classSubjectId);
  }

  @Patch('student-term-reports')
  @Roles('admin', 'staff', 'teacher')
  upsertTermReport(
    @CurrentUser() user: AuthUser,
    @Query('studentProfileId') studentProfileId: string,
    @Query('termId') termId: string,
    @Body() dto: UpsertTermReportDto,
  ) {
    return this.academicsService.upsertStudentTermReport(
      user.schoolId,
      studentProfileId,
      termId,
      dto,
    );
  }

  @Get('assessments')
  @Roles('admin', 'teacher')
  listAssessments(
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string,
    @Query('classSubjectId') classSubjectId?: string,
  ) {
    return this.academicsService.listAssessments(
      user.schoolId,
      termId,
      classSubjectId,
      user.id,
      user.role,
    );
  }

  @Post('assessments')
  @Roles('admin', 'teacher')
  createAssessment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.academicsService.createAssessment(
      user.schoolId,
      dto,
      user.id,
      user.role,
    );
  }

  @Get('assessments/:id/grid')
  @Roles('admin', 'teacher')
  scoreGrid(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.academicsService.getScoreGrid(
      user.schoolId,
      id,
      user.id,
      user.role,
    );
  }

  @Post('scores/bulk')
  @Roles('admin', 'teacher')
  bulkScores(@CurrentUser() user: AuthUser, @Body() dto: BulkScoresDto) {
    return this.academicsService.bulkSaveScores(
      user.schoolId,
      dto,
      user.id,
      user.role,
    );
  }

  @Get('report-card')
  @Roles('admin', 'teacher', 'parent', 'student')
  async reportCard(
    @CurrentUser() user: AuthUser,
    @Query('studentProfileId') studentProfileId: string | undefined,
    @Query('termId') termId: string,
  ) {
    const profileId = await this.academicsService.resolveProfileId(
      user.role,
      user.id,
      user.schoolId,
      studentProfileId,
    );
    return this.academicsService.buildReportCard(
      user.schoolId,
      profileId,
      termId,
      user.role,
    );
  }

  @Get('report-card/html')
  @Roles('admin', 'teacher', 'parent', 'student')
  @Header('Content-Type', 'text/html')
  async reportCardHtml(
    @CurrentUser() user: AuthUser,
    @Query('studentProfileId') studentProfileId: string | undefined,
    @Query('termId') termId: string,
    @Res() res: Response,
  ) {
    const profileId = await this.academicsService.resolveProfileId(
      user.role,
      user.id,
      user.schoolId,
      studentProfileId,
    );
    res.send(
      await this.academicsService.buildReportCardHtmlDocument(
        user.schoolId,
        profileId,
        termId,
        user.role,
      ),
    );
  }
}
