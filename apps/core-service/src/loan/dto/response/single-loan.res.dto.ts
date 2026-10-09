import { ApiProperty } from '@nestjs/swagger';

import { LoanDetailsRespDto } from '@app/core-service/src/account/dto';
import { AccountStatus } from '@libs/database';
import { Expose, Type } from 'class-transformer';

export class RepaymentScheduleItemDto {
  @ApiProperty({ example: 1 })
  @Expose()
  installmentNumber: number;

  @ApiProperty({ example: '2026-10-15T00:00:00.000Z' })
  @Expose()
  dueDate: Date;

  @ApiProperty({ example: '8333.33' })
  @Expose()
  principalAmount: string;

  @ApiProperty({ example: '0.00' })
  @Expose()
  interestAmount: string;

  @ApiProperty({ example: '9375.00' })
  @Expose()
  totalInstallment: string;

  @ApiProperty({ example: '91666.67' })
  @Expose()
  remainingBalance: string;

  @ApiProperty({ example: '0' })
  @Expose()
  chargeAmount: string;

  @ApiProperty({ example: '0' })
  @Expose()
  chargePaid: string;
}

export class SingleLoanRespDto {
  @ApiProperty({ example: '87u0f64c-dc44-7e33-a444-52a0a98a0203' })
  @Expose()
  accountId: string;

  @ApiProperty({ example: '0123456789' })
  @Expose()
  accountNumber: string;

  @ApiProperty({ example: 'JOHN DOE LOAN ACCOUNT' })
  @Expose()
  accountName: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  customerId: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.Active })
  @Expose()
  status: AccountStatus;

  @ApiProperty({ example: '-100000.00' })
  @Expose()
  availableBalance: string;

  @ApiProperty({ example: '-100000.00' })
  @Expose()
  bookBalance: string;

  @ApiProperty({ type: () => LoanDetailsRespDto })
  @Expose()
  @Type(() => LoanDetailsRespDto)
  loanDetails: LoanDetailsRespDto;

  @ApiProperty({
    description: 'Total principal amount borrowed',
    example: '100000',
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
  repaymentSchedule: RepaymentScheduleItemDto[];
}
