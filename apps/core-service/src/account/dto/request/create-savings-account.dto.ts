import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidDate, IsValidReference } from '@lib/common/src/validators';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSavingsAccountDto {
  @ApiPropertyOptional({
    description:
      'Flag indicating whether to immediately activate the savings account',
    default: false,
    example: false,
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

  @ApiProperty({
    description:
      'Identifier of the savings product associated with this account',
    example: 101,
  })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiPropertyOptional({
    description: 'Creation date in YYYY-MM-DD format',
    example: '2026-07-30',
  })
  @IsValidDate()
  @IsOptional()
  createdDate?: string;

  @ApiPropertyOptional({
    description: 'Initial deposit amount on account opening',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;
}
