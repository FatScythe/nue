import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import moment from 'moment';

import {
  DATE_FORMAT,
  IsNumericString,
  IsValidDate,
  IsValidReference,
} from '@common';

export class CreateSavingsAccountDto {
  @ApiPropertyOptional({
    description:
      'Flag indicating whether to immediately activate the savings account',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activate: boolean = false;

  @ApiPropertyOptional({
    description: 'External reference identifier',
    example: 'REF-2026-00123',
  })
  @IsOptional()
  @IsValidReference()
  @IsString()
  reference?: string;

  @ApiProperty({
    description: 'Unique identifier (UUID) of the customer',
    example: '018f3a5e-1234-7a2b-8123-456789abcdef',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Custom account display name',
    example: 'John Doe Savings',
  })
  @IsOptional()
  @IsString()
  accountName?: string;

  // @ApiPropertyOptional({
  //   description: 'Account type',
  //   enum: AccountType,
  //   example: AccountType.Savings,
  // })
  // @IsEnum(AccountType)
  // @IsString()
  // type: AccountType;

  // @ApiProperty({
  //   description:
  //     'Identifier of the savings product associated with this account',
  //   example: 101,
  // })
  // @IsInt()
  // @IsNotEmpty()
  // productId: number;

  @ApiPropertyOptional({
    description: 'Creation date in YYYY-MM-DD format',
    example: moment().format(DATE_FORMAT),
  })
  @IsValidDate()
  @IsOptional()
  createdDate?: string;

  @ApiPropertyOptional({
    description: 'Initial deposit amount on account opening',
    example: '0.0',
  })
  @IsOptional()
  @IsNumericString({
    min: 0,
    maxDecimalPlaces: 2,
  })
  openingBalance?: string;

  @ApiPropertyOptional({
    description: 'Target amount for target savings in major units',
    example: null,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  targetAmount?: number;

  @ApiPropertyOptional({
    description: 'Target date (YYYY-MM-DD)',
    example: null,
  })
  @IsString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'Lock period end timestamp/date',
    example: null,
  })
  @IsString()
  @IsOptional()
  lockPeriodEnd?: string;

  @ApiProperty({
    example: '1010',
    description: 'Savings account control gl code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  depositGlCode: string;

  @ApiProperty({
    example: '3310',
    description: 'Savings account fee gl code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  feeGlCode?: string;
}
