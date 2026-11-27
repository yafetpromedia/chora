import { IsString, MinLength } from 'class-validator';

export class PublicStudentResultsUnlockDto {
  @IsString()
  @MinLength(2)
  schoolCode!: string;

  @IsString()
  @MinLength(4)
  cardCode!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
