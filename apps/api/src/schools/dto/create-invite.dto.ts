import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { JoinRole } from '../../auth/dto/join-school.dto';

const inviteRoles = ['teacher', 'student', 'parent'] as const;

export class CreateInviteDto {
  @IsEnum(inviteRoles)
  role!: JoinRole;

  @IsString()
  @IsOptional()
  label?: string;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  expiresInDays?: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxUses?: number;
}
