import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [SchoolsModule, TeachersModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
