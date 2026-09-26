import { ApiProperty } from '@nestjs/swagger';

import { LoanDetailsRespDto } from '@app/core-service/src/account/dto';
import { Expose, Type } from 'class-transformer';

import { AccountStatus } from '@database';

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
  @ApiProperty({ example: 'acc_123456789' })
  @Expose()
  accountId: string;

  @ApiProperty({ example: '0123456789' })
  @Expose()
  accountNumber: string;

  @ApiProperty({ example: 'John Doe Loan Account' })
  @Expose()
  accountName: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  customerId: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.Active })
  @Expose()
  status: AccountStatus;

  @ApiProperty({ example: '100000' })
  @Expose()
  balance: string;

  @ApiProperty({ example: '100000' })
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
  repaymentSchedule: RepaymentScheduleItemDto[];
}
