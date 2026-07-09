import { IsString, MinLength } from 'class-validator';

export class VerifyStudentEnrollmentDto {
  @IsString()
  @MinLength(4)
  schoolCode!: string;

  @IsString()
  @MinLength(3)
  studentId!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
