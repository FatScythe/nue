import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { IsValidReference } from '@common';
import { GlCategory, GlNormalBalance } from '@database';

export class CreateGlAccountDto {
  @ApiProperty({
    example: '1010',
    description: 'Unique ledger code per tenant',
  })
  @Length(1, 10)
  @IsValidReference()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Cash and Cash Equivalents',
    description: 'Name of GL account',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: GlCategory,
    example: GlCategory.Asset,
    description: 'Accounting category',
  })
  @IsEnum(GlCategory)
  @IsNotEmpty()
  category: GlCategory;

  @ApiPropertyOptional({
    enum: GlNormalBalance,
    example: GlNormalBalance.Debit,
    description:
      'Normal balance type. Defaults automatically based on category if omitted.',
  })
  @IsEnum(GlNormalBalance)
  @IsOptional()
  normalBalance?: GlNormalBalance;

  @ApiPropertyOptional({
    example: '7010',
    description: 'Parent GL Code for sub-ledgers',
  })
  @Length(1, 10)
  @IsValidReference()
  @IsOptional()
  parentGlCode?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether direct journal entries are allowed',
  })
  @IsBoolean()
  @IsOptional()
  allowDirectBooking?: boolean;
}
