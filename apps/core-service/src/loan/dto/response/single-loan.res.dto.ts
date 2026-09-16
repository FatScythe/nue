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

  @ApiProperty({ example: 8333.33 })
  @Expose()
  principalAmount: number;

  @ApiProperty({ example: 1041.67 })
  @Expose()
  interestAmount: number;

  @ApiProperty({ example: 9375.0 })
  @Expose()
  totalInstallment: number;

  @ApiProperty({ example: 91666.67 })
  @Expose()
  remainingBalance: number;
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

  @ApiProperty({ example: 100000 })
  @Expose()
  balance: number;

  @ApiProperty({ example: 100000 })
  @Expose()
  bookBalance: number;

  @ApiProperty({ type: () => LoanDetailsRespDto })
  @Expose()
  @Type(() => LoanDetailsRespDto)
  loanDetails: LoanDetailsRespDto;

  @ApiProperty({ type: [RepaymentScheduleItemDto] })
  @Expose()
  @Type(() => RepaymentScheduleItemDto)
  repaymentSchedule: RepaymentScheduleItemDto[];
}
