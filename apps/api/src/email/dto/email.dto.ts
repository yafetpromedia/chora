import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAILBOX_IDS, type MailboxId } from '../email.types';

export class UpdateEmailPreferencesDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  absenceEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  lateEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  examinationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  announcementEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentReminderEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentConfirmationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  reportCardEnabled?: boolean;
}

export class SendTestEmailDto {
  @IsEmail()
  @MaxLength(254)
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateId?: string;

  @IsOptional()
  @IsIn(MAILBOX_IDS)
  mailboxId?: MailboxId;
}
