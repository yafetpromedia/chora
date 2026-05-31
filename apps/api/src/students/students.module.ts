import { Module } from '@nestjs/common';
import { FayedaModule } from '../fayeda/fayeda.module';
import { ResultsModule } from '../results/results.module';
import { MeStudentsController } from './me-students.controller';
import { ParentsController } from './parents.controller';
import { StudentCardsController } from './student-cards.controller';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [FayedaModule, ResultsModule],
  controllers: [
    StudentsController,
    StudentCardsController,
    MeStudentsController,
    ParentsController,
  ],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
