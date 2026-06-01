import { Module } from '@nestjs/common';
import { TimetableModule } from '../timetable/timetable.module';
import { UsersModule } from '../users/users.module';
import { TeachersController } from './teachers.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherScopeService } from './teacher-scope.service';
import { TeachersService } from './teachers.service';

@Module({
  imports: [UsersModule, TimetableModule],
  controllers: [TeachersController],
  providers: [TeachersService, TeacherScopeService, TeacherDashboardService],
  exports: [TeachersService, TeacherScopeService, TeacherDashboardService],
})
export class TeachersModule {}
