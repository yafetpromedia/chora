import { Module } from '@nestjs/common';
import { FayedaModule } from '../fayeda/fayeda.module';
import { FinanceModule } from '../finance/finance.module';
import { ResultsModule } from '../results/results.module';
import { UsersModule } from '../users/users.module';
import { MeStudentsController } from './me-students.controller';
import { ParentsController } from './parents.controller';
import { StudentCardsController } from './student-cards.controller';
import { StudentRecordsController } from './student-records.controller';
import { StudentsController } from './students.controller';
import { StudentRecordsService } from './student-records.service';
import { StudentsService } from './students.service';

@Module({
  imports: [FayedaModule, ResultsModule, FinanceModule, UsersModule],
  controllers: [
    StudentRecordsController,
    StudentCardsController,
    StudentsController,
    MeStudentsController,
    ParentsController,
  ],
  providers: [StudentsService, StudentRecordsService],
  exports: [StudentsService, StudentRecordsService],
})
export class StudentsModule {}
