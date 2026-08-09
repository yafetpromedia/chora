import { IsBoolean, IsOptional } from 'class-validator';

export class RunPlacementDto {
  /** Re-run placement for applications already marked PLACED. */
  @IsBoolean()
  @IsOptional()
  includePlaced?: boolean;
}
