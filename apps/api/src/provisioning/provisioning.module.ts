import { Module } from '@nestjs/common';
import { GradesModule } from '../grades/grades.module';
import { LibraryModule } from '../library/library.module';
import { ResultsModule } from '../results/results.module';
import { CurriculumCatalogService } from './curriculum-catalog.service';
import { SchoolProvisioningService } from './school-provisioning.service';

@Module({
  imports: [GradesModule, ResultsModule, LibraryModule],
  providers: [CurriculumCatalogService, SchoolProvisioningService],
  exports: [CurriculumCatalogService, SchoolProvisioningService],
})
export class ProvisioningModule {}
