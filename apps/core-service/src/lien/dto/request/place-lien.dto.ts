import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import moment from 'moment';

import { IsValidDate, IsValidReference } from '@common';
import { DEFAULT_MALE_ACCOUNT_ID } from '@database';

export class PlaceLienDto {
  @ApiProperty({
    example: DEFAULT_MALE_ACCOUNT_ID,
    description: 'Savings/Current account ID',
  })
  @IsUUID('7')
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: '5000.50',
    description: 'Hold amount in minor units (kobo/cents)',
  })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({
    example: 'Collateral hold for micro-loan #4920',
    description: 'Reason for placing hold',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({
    example: 'LIEN-REF-2026-001',
    description: 'Unique reference string per tenant',
  })
  @IsValidReference()
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({
    example: moment().add(1, 'day').toISOString(),
    description: 'Optional automated release date',
  })
  @IsDateString()
  @IsValidDate()
  @IsOptional()
  expiresAt?: string;
}
