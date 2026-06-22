import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { ClassworkController } from './classwork.controller';
import { ClassworkService } from './classwork.service';

@Module({
  imports: [TeachersModule],
  controllers: [ClassworkController],
  providers: [ClassworkService],
  exports: [ClassworkService],
})
export class ClassworkModule {}
