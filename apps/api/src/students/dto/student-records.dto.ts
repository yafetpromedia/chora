import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ALLOWED_BLOOD_TYPES } from '../../common/validators/blood-type';
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
  @ValidateIf((_, v) => v !== undefined && String(v).trim() !== '')
  @IsIn([...ALLOWED_BLOOD_TYPES])
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
