import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class SetAssessmentEntryLockDto {
  @IsBoolean()
  entryLocked!: boolean;

  /** `this` = current class-subject only; `all` = every grade/subject in the term */
  @IsOptional()
  @IsIn(['this', 'all'])
  scope?: 'this' | 'all';
}
