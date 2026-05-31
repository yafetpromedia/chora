import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PaymentAllocationDto {
  @IsOptional()
  @IsString()
  studentFeeId?: string;

  @IsOptional()
  @IsString()
  installmentId?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;
}

export class RecordPaymentDto {
  @IsString()
  studentProfileId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsIn(['CASH', 'BANK_TRANSFER', 'TELEBIRR', 'CHAPA', 'OTHER'])
  method!: 'CASH' | 'BANK_TRANSFER' | 'TELEBIRR' | 'CHAPA' | 'OTHER';

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}
