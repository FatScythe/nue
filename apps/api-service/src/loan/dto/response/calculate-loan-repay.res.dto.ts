import { ApiProperty } from '@nestjs/swagger';

import { Expose, Type } from 'class-transformer';

import { RepaymentScheduleItemDto } from './single-loan.res.dto';

export class CalculateLoanRepaymentRespDto {
  @ApiProperty({
    description: 'Total principal amount borrowed',
    example: '100000.00',
  })
  @Expose()
  totalPrincipal: string;

  @ApiProperty({
    description: 'Total interest accrued over the tenor',
    example: '0.00',
  })
  @Expose()
  totalInterest: string;

  @ApiProperty({
    description: 'Sum of principal and total interest',
    example: '100000.00',
  })
  @Expose()
  totalRepayment: string;

  @ApiProperty({
    description:
      'Total processing charge to be paid for the duration of the loan',
    example: '1000.00',
  })
  @Expose()
  totalCharge: string;

  @ApiProperty({ type: [RepaymentScheduleItemDto] })
  @Expose()
  @Type(() => RepaymentScheduleItemDto)
  schedules: RepaymentScheduleItemDto[];
}
