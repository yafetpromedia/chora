import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** School join code (e.g. BRIGHT1). Omit only if your username is unique on the server. */
  @IsString()
  @IsOptional()
  schoolCode?: string;

  /** Sign-in username (not email). Legacy: email or STU-/TCH- ID still accepted. */
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
