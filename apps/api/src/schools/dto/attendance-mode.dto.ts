import { IsIn } from 'class-validator';

export class AttendanceModeDto {
  @IsIn(['DAILY', 'PERIOD', 'BOTH'])
  mode!: 'DAILY' | 'PERIOD' | 'BOTH';
}
