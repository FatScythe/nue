import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import moment from 'moment';

import {
  DATE_FORMAT,
  IsNumericString,
  IsValidDate,
  IsValidReference,
} from '@common';
import { LoanRepaymentFrequency, MoratoriumType } from '@database';

export class CreateLoanAccountDto {
  @ApiProperty({
    description: 'Target Customer ID',
    example: '019ff6e3-14bd-7da7-bc81-f83e8d48a883',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Custom account name. Defaults to customer full name.',
    example: 'John Doe Loan',
  })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiProperty({
    description: 'Principal amount in major currency (e.g. 50000.00)',
    example: '50000.00',
  })
  @IsNumericString({ min: 0, maxDecimalPlaces: 2 })
  principalAmount: string;

  @ApiProperty({ description: 'Loan tenor in months or periods', example: 12 })
  @IsInt()
  @Min(1)
  tenor: number;

  @ApiProperty({
    enum: LoanRepaymentFrequency,
    default: LoanRepaymentFrequency.Monthly,
  })
  @IsEnum(LoanRepaymentFrequency)
  repaymentFrequency: LoanRepaymentFrequency;

  @ApiProperty({ description: 'Interest rate percentage', example: 0.0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiPropertyOptional({
    description: 'Processing fee in major currency',
    example: '500.0',
  })
  @IsNumericString({ min: 0, maxDecimalPlaces: 2 })
  @IsOptional()
  processingFee?: string;

  @ApiPropertyOptional({ enum: MoratoriumType, default: MoratoriumType.None })
  @IsEnum(MoratoriumType)
  @IsOptional()
  moratoriumType?: MoratoriumType;

  @ApiPropertyOptional({ description: 'Moratorium duration', default: 0 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  moratoriumPeriod?: number;

  @ApiPropertyOptional({
    description: 'Activate account immediately upon creation',
    default: false,
    example: true,
  })
  @IsOptional()
  activate?: boolean = false;

  @ApiPropertyOptional({
    example: moment().format(DATE_FORMAT),
    description: 'Override creation date (YYYY-MM-DD)',
  })
  @IsValidDate()
  @IsOptional()
  createdDate?: string;

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

  @ApiProperty({
    example: '9041',
    description:
      'Loan account control gl code where loan amount is disbursed from',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  loanGlCode: string;

  @ApiProperty({
    example: '9071',
    description: 'Loan account income gl code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  incomeGlCode: string;

  @ApiProperty({
    example: '3310',
    description:
      'Loan fees income gl account code where loan fee is disbursed to',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  feeGlCode?: string;
}
