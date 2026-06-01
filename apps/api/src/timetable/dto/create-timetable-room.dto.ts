import { IsString } from 'class-validator';

export class CreateTimetableRoomDto {
  @IsString()
  academicYearId!: string;

  @IsString()
  name!: string;
}
