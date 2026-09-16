import { ApiProperty } from '@nestjs/swagger';

import { Expose, Type } from 'class-transformer';

import { RepaymentScheduleItemDto } from './single-loan.res.dto';

export class CalculateLoanRepaymentRespDto {
  @ApiProperty({
    description: 'Total principal amount borrowed',
    example: 100000,
  })
  @Expose()
  totalPrincipal: number;

  @ApiProperty({
    description: 'Total interest accrued over the tenor',
    example: 12500,
  })
  @Expose()
  totalInterest: number;

  @ApiProperty({
    description: 'Sum of principal and total interest',
    example: 112500,
  })
  @Expose()
  totalRepayment: number;

  @ApiProperty({ type: [RepaymentScheduleItemDto] })
  @Expose()
  @Type(() => RepaymentScheduleItemDto)
  schedule: RepaymentScheduleItemDto[];
}
