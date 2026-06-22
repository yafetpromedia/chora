import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum StudyAssistAction {
  SUMMARIZE = 'summarize',
  QUIZ = 'quiz',
  TRANSLATE = 'translate',
}

export class StudyAssistDto {
  @IsEnum(StudyAssistAction)
  action!: StudyAssistAction;

  @IsString()
  @MinLength(10)
  @MaxLength(12000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;
}
