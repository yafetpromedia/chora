import { IsDateString, IsIn, IsString } from 'class-validator';

export class MarkAttendanceDto {
  @IsString()
  studentId!: string;

  @IsDateString()
  date!: string;

  @IsIn(['present', 'absent', 'late'])
  status!: 'present' | 'absent' | 'late';
}
