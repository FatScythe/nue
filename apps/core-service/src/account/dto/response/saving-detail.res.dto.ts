import { ApiPropertyOptional } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import moment from 'moment';

export class SavingsDetailsRespDto {
  @ApiPropertyOptional({ example: '1500000' })
  @Expose()
  targetAmount?: string | null;

  @ApiPropertyOptional({
    example: moment().add(1, 'year').toISOString(),
  })
  @Expose()
  targetDate?: Date | null;

  // @ApiPropertyOptional()
  // @Expose()
  // interestRate?: number;

  @ApiPropertyOptional({ example: 1 })
  @Expose()
  withdrawalCountThisMonth?: number;

  @ApiPropertyOptional({
    example: moment().add(1, 'year').toISOString(),
  })
  @Expose()
  lockPeriodEnd?: Date | null;
}
