import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { LoanRepaymentFrequency, MoratoriumType } from '@database';

export class CalculateLoanRepaymentDto {
  // @ApiPropertyOptional()
  // @IsString()
  // @IsOptional()
  // productId?: string;

  @ApiProperty({ description: 'Principal loan amount', example: 100000 })
  @IsNumber()
  @IsPositive()
  principalAmount: number;

  @ApiProperty({
    description: 'Annual interest rate percentage (0 to 100)',
    example: 0.0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

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
  @IsNumber()
  @Min(0)
  moratoriumPeriod?: number;
}
