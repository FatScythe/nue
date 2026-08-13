import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { LoanRepaymentFrequency, LoanStatus, MoratoriumType } from '@database';

export class LoanDetailsRespDto {
  @ApiProperty()
  @Expose()
  principalAmount: number;

  @ApiProperty()
  @Expose()
  outstandingBalance: number;

  @ApiProperty()
  @Expose()
  tenor: number;

  @ApiProperty({ enum: LoanRepaymentFrequency })
  @Expose()
  repaymentFrequency: LoanRepaymentFrequency | string;

  @ApiProperty()
  @Expose()
  interestRate: number;

  @ApiProperty({ enum: LoanStatus })
  @Expose()
  status: LoanStatus | string;

  @ApiProperty()
  @Expose()
  processingFee: number;

  @ApiProperty({ enum: MoratoriumType })
  @Expose()
  moratoriumType: MoratoriumType | string;

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
