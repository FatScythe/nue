import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import moment from 'moment';

import {
  ChargeCalculationType,
  ChargeTime,
  LoanRepaymentFrequency,
  LoanStatus,
  MoratoriumType,
} from '@database';

export class LoanDetailsRespDto {
  @ApiProperty({ example: '500000.00' })
  @Expose()
  principalAmount: string;

  @ApiProperty({ example: '510000.00' })
  @Expose()
  outstandingBalance: string;

  @ApiProperty({ example: 12 })
  @Expose()
  tenor: number;

  @ApiProperty({
    enum: LoanRepaymentFrequency,
    example: LoanRepaymentFrequency.Monthly,
  })
  @Expose()
  repaymentFrequency: LoanRepaymentFrequency;

  @ApiProperty({ example: 0.0 })
  @Expose()
  interestRate: number;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.Disbursed })
  @Expose()
  status: LoanStatus;

  @ApiProperty({ example: '10000.00' })
  @Expose()
  chargeValue: string;

  @ApiProperty({
    enum: ChargeCalculationType,
    example: ChargeCalculationType.Fixed,
  })
  @Expose()
  chargeCalculationType: ChargeCalculationType;

  @ApiProperty({ enum: ChargeTime, example: ChargeTime.Upfront })
  @Expose()
  chargeTime: ChargeTime;

  @ApiProperty({ enum: MoratoriumType, example: MoratoriumType.None })
  @Expose()
  moratoriumType: MoratoriumType;

  @ApiProperty({ example: 0 })
  @Expose()
  moratoriumPeriod: number;

  @ApiProperty({ example: moment().endOf('month').toISOString() })
  @Expose()
  repaymentStartDate: Date;

  @ApiPropertyOptional({ example: moment().startOf('month').toISOString() })
  @Expose()
  disbursedAt?: Date;

  @ApiPropertyOptional({ example: null })
  @Expose()
  closedAt?: Date;
}
