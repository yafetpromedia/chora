import { Module } from '@nestjs/common';
import { ResultsModule } from '../results/results.module';
import { TeachersModule } from '../teachers/teachers.module';
import { ClassworkController } from './classwork.controller';
import { ClassworkService } from './classwork.service';

@Module({
  imports: [TeachersModule, ResultsModule],
  controllers: [ClassworkController],
  providers: [ClassworkService],
  exports: [ClassworkService],
})
export class ClassworkModule {}
