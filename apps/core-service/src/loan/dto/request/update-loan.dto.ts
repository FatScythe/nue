import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

import { IsNumericString, IsValidReference } from '@common';
import {
  ChargeCalculationType,
  ChargeTime,
  InterestRateType,
  LoanRepaymentFrequency,
  MoratoriumType,
} from '@database';

export class UpdateLoanDetailsDto {
  @ApiPropertyOptional({
    description: 'Custom account name',
    example: 'John Doe Loan - Refinanced',
  })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({
    description: 'Principal amount in major currency (e.g. 50000.00)',
    example: '50000.00',
  })
  @IsNumericString({ min: 0, maxDecimalPlaces: 2 })
  @IsOptional()
  principalAmount?: string;

  @ApiPropertyOptional({
    description: 'Loan tenor in months or periods',
    example: 12,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  tenor?: number;

  @ApiPropertyOptional({
    enum: LoanRepaymentFrequency,
    example: LoanRepaymentFrequency.Monthly,
  })
  @IsEnum(LoanRepaymentFrequency)
  @IsOptional()
  repaymentFrequency?: LoanRepaymentFrequency;

  @ApiPropertyOptional({
    description: 'Annual interest rate percentage (0 to 100)',
    example: 12.5,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({
    enum: InterestRateType,
    example: InterestRateType.DecliningBalance,
  })
  @IsEnum(InterestRateType)
  @IsOptional()
  interestRateType?: InterestRateType;

  @ApiPropertyOptional({
    description: 'Processing or loan charge value',
    example: '500.00',
  })
  @IsNumericString({ min: 0, maxDecimalPlaces: 2 })
  @IsOptional()
  chargeValue?: string;

  @ApiPropertyOptional({
    enum: ChargeCalculationType,
    example: ChargeCalculationType.Fixed,
  })
  @IsEnum(ChargeCalculationType)
  @IsOptional()
  chargeCalculationType?: ChargeCalculationType;

  @ApiPropertyOptional({
    enum: ChargeTime,
    example: ChargeTime.Upfront,
  })
  @IsEnum(ChargeTime)
  @IsOptional()
  chargeTime?: ChargeTime;

  @ApiPropertyOptional({ enum: MoratoriumType, example: MoratoriumType.None })
  @IsEnum(MoratoriumType)
  @IsOptional()
  moratoriumType?: MoratoriumType;

  @ApiPropertyOptional({ description: 'Moratorium duration', example: 0 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  moratoriumPeriod?: number;

  @ApiPropertyOptional({
    description: 'Savings/Deposit Account ID to disburse loan funds into',
    example: '019ff6e3-14bd-7da7-bc81-f83e8d48a883',
  })
  @IsUUID(7)
  @IsOptional()
  disbursementAccountId?: string;

  @ApiPropertyOptional({
    description: 'Savings/Deposit Account ID to auto-debit for loan repayments',
    example: '019ff6e3-14bd-7da7-bc81-f83e8d48a883',
  })
  @IsUUID(7)
  @IsOptional()
  repaymentAccountId?: string;

  @ApiPropertyOptional({
    example: '9041',
    description: 'Loan account control GL code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  loanGlCode?: string;

  @ApiPropertyOptional({
    example: '9071',
    description: 'Loan account income GL code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  incomeGlCode?: string;

  @ApiPropertyOptional({
    example: '3310',
    description: 'Loan fees income GL account code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  feeGlCode?: string;
}
