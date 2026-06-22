import { IsBoolean } from 'class-validator';

export class SetAssessmentEntryLockDto {
  @IsBoolean()
  entryLocked!: boolean;
}
