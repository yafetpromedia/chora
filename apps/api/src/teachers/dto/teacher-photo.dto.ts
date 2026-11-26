import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitTeacherPhotoDto {
  @IsString()
  @MinLength(32)
  photoUrl!: string;
}

export class ReviewTeacherPhotoDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
