import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SavingsDetailsRespDto {
  @ApiPropertyOptional()
  @Expose()
  id?: string;

  @ApiPropertyOptional()
  @Expose()
  targetAmount?: number | null;

  // @ApiPropertyOptional()
  // @Expose()
  // interestRate?: number;

  @ApiPropertyOptional()
  @Expose()
  lockPeriod?: number;

  @ApiPropertyOptional()
  @Expose()
  createdAt?: Date;
}
