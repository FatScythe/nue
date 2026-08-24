import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidDate, IsValidReference } from '@lib/common/src/validators';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AccountType } from '@database';
import { DATE_FORMAT } from '@common';
import moment from 'moment';

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
    example: 0.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;

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
}
