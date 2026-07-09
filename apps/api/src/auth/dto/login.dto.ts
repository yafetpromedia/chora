import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** School join code (required for all school portal sign-ins). */
  @IsString()
  @MinLength(4)
  schoolCode!: string;

  /** Sign-in username (not email). Legacy: email or STU-/TCH- ID still accepted. */
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
