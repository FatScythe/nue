import { ApiProperty } from '@nestjs/swagger';

import { Expose, Type } from 'class-transformer';

import { RepaymentScheduleItemDto } from './single-loan.res.dto';

export class CalculateLoanRepaymentRespDto {
  @ApiProperty({
    description: 'Total principal amount borrowed',
    example: '100000',
  })
  @Expose()
  totalPrincipal: string;

  @ApiProperty({
    description: 'Total interest accrued over the tenor',
    example: '12500',
  })
  @Expose()
  totalInterest: string;

  @ApiProperty({
    description: 'Sum of principal and total interest',
    example: '112500',
  })
  @Expose()
  totalRepayment: string;

  @ApiProperty({ type: [RepaymentScheduleItemDto] })
  @Expose()
  @Type(() => RepaymentScheduleItemDto)
  schedules: RepaymentScheduleItemDto[];
}
