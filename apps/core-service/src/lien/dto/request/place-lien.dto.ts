import { IsValidDate, IsValidReference } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class PlaceLienDto {
  @ApiProperty({
    example: '018f3a5e-7a2b-7c8d-9e0f-1a2b3c4d5e6f',
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
    example: '2026-12-31T23:59:59.000Z',
    description: 'Optional automated release date',
  })
  @IsDateString()
  @IsValidDate()
  @IsOptional()
  expiresAt?: string;
}
