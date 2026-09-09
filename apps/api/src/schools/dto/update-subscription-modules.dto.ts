import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriptionModulesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsString()
  bundleId?: string | null;
}
