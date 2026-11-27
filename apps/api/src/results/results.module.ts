import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { AcademicEnrollmentService } from './academic-enrollment.service';
import { AcademicPromotionService } from './academic-promotion.service';
import { AcademicYearsService } from './academic-years.service';
import { AcademicsService } from './academics.service';
import { AssessmentTemplatesService } from './assessment-templates.service';
import { ResultWorkflowService } from './result-workflow.service';
import { ReportCardPublicController } from './report-card-public.controller';
import { PublicStudentResultsController } from './public-student-results.controller';
import { PublicStudentResultsService } from './public-student-results.service';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { ScoreCorrectionsService } from './score-corrections.service';

@Module({
  imports: [TeachersModule],
  controllers: [
    ResultsController,
    ReportCardPublicController,
    PublicStudentResultsController,
  ],
  providers: [
    ResultsService,
    AcademicsService,
    AssessmentTemplatesService,
    AcademicYearsService,
    ResultWorkflowService,
    AcademicEnrollmentService,
    AcademicPromotionService,
    ScoreCorrectionsService,
    PublicStudentResultsService,
  ],
  exports: [
    AcademicsService,
    AssessmentTemplatesService,
    AcademicYearsService,
    ResultWorkflowService,
    AcademicEnrollmentService,
    AcademicPromotionService,
    ScoreCorrectionsService,
  ],
})
export class ResultsModule {}
