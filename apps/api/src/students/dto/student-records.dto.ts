import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BehaviorRecordType,
  StudentCertificateType,
  StudentDocumentType,
  StudentRecordStatus,
} from '@prisma/client';

export class CreateBehaviorRecordDto {
  @IsDateString()
  date!: string;

  @IsEnum(BehaviorRecordType)
  type!: BehaviorRecordType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateHealthRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  bloodType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalConditions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicationNotes?: string;
}

export class IssueCertificateDto {
  @IsEnum(StudentCertificateType)
  type!: StudentCertificateType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateStudentStatusDto {
  @IsEnum(StudentRecordStatus)
  status!: StudentRecordStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UploadStudentDocumentDto {
  @IsEnum(StudentDocumentType)
  type!: StudentDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
