import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import {
  ChargeCalculationType,
  ChargeTime,
  LoanRepaymentFrequency,
  LoanStatus,
  MoratoriumType,
} from '@database';

export class LoanDetailsRespDto {
  @ApiProperty()
  @Expose()
  principalAmount: string;

  @ApiProperty()
  @Expose()
  outstandingBalance: string;

  @ApiProperty()
  @Expose()
  tenor: number;

  @ApiProperty({ enum: LoanRepaymentFrequency })
  @Expose()
  repaymentFrequency: LoanRepaymentFrequency;

  @ApiProperty()
  @Expose()
  interestRate: number;

  @ApiProperty({ enum: LoanStatus })
  @Expose()
  status: LoanStatus;

  @ApiProperty()
  @Expose()
  chargeValue: number;

  @ApiProperty()
  @Expose()
  chargeCalculationType: ChargeCalculationType;

  @ApiProperty()
  @Expose()
  chargeTime: ChargeTime;

  @ApiProperty({ enum: MoratoriumType })
  @Expose()
  moratoriumType: MoratoriumType;

  @ApiProperty()
  @Expose()
  moratoriumPeriod: number;

  @ApiProperty()
  @Expose()
  repaymentStartDate: Date;

  @ApiPropertyOptional()
  @Expose()
  disbursedAt?: Date;

  @ApiPropertyOptional()
  @Expose()
  closedAt?: Date;
}
