import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AttendanceConcernsService } from './attendance-concerns.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [SchoolsModule, TeachersModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceConcernsService],
  exports: [AttendanceService, AttendanceConcernsService],
})
export class AttendanceModule {}
