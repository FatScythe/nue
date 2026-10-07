import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ICalculateLoanRepayment } from '@app/core-service/src/common/types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { IsNumericString } from '@common';
import {
  ChargeCalculationType,
  ChargeTime,
  InterestRateType,
  LoanRepaymentFrequency,
  MoratoriumType,
} from '@database';

export class CalculateLoanRepaymentDto implements ICalculateLoanRepayment {
  // @ApiPropertyOptional()
  // @IsString()
  // @IsOptional()
  // productId?: string;

  @ApiProperty({ description: 'Principal loan amount', example: '500000.00' })
  @IsNumericString({
    min: 0,
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  principalAmount: string;

  @ApiProperty({
    description:
      'Annual interest rate percentage (0 to 100, e.g., 12.5 for 12.5%)',
    example: 12.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiProperty({
    enum: InterestRateType,
    example: InterestRateType.DecliningBalance,
  })
  @IsEnum(InterestRateType)
  interestRateType: InterestRateType;

  @ApiProperty({
    description: 'Loan tenor in terms of the repayment frequency units',
    example: 12,
  })
  @IsPositive()
  @IsInt()
  @Max(100)
  tenor: number;

  @ApiProperty({
    enum: LoanRepaymentFrequency,
    example: LoanRepaymentFrequency.Monthly,
  })
  @IsEnum(LoanRepaymentFrequency)
  repaymentFrequency: LoanRepaymentFrequency;

  @ApiPropertyOptional({
    description: 'Date when repayments begin (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsString()
  repaymentStartDate?: string;

  @ApiPropertyOptional({ enum: MoratoriumType })
  @IsOptional()
  @IsEnum(MoratoriumType)
  moratoriumType?: MoratoriumType;

  @ApiPropertyOptional({
    description: 'Grace period length matching the frequency unit',
    example: 0,
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Min(0)
  moratoriumPeriod?: number;

  @ApiPropertyOptional({
    description:
      'Processing or loan charge value (fixed amount or percentage rate)',
    example: '5000.0',
    minimum: 0,
  })
  @IsNumericString({ min: 0, maxDecimalPlaces: 2 })
  @IsOptional()
  chargeValue?: string;

  @ApiPropertyOptional({
    description: 'Calculation method for loan charges',
    enum: ChargeCalculationType,
    example: ChargeCalculationType.Fixed,
  })
  @IsEnum(ChargeCalculationType)
  @IsOptional()
  chargeCalculationType?: ChargeCalculationType;

  @ApiPropertyOptional({
    description: 'Timing of charge collection',
    enum: ChargeTime,
    example: ChargeTime.Upfront,
  })
  @IsEnum(ChargeTime)
  @IsOptional()
  chargeTime?: ChargeTime;
}
