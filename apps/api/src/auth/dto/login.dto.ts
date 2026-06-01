import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Email address or student ID (e.g. STU-K7H3NP2M). */
  @IsString()
  @MinLength(3)
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
