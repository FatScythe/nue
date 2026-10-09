import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsNumericString, IsValidReference } from '@libs/common';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AccountToAccountTransferDto {
  @ApiProperty({
    example: '018f3a5e-7a2b-7c8d-9e0f-1a2b3c4d5e6f',
    description: 'Source account ID',
  })
  @IsUUID('7')
  @IsNotEmpty()
  senderAccountId: string;

  @ApiProperty({
    example: '018f3a5e-8b3c-7c8d-9e0f-1a2b3c4d5e7a',
    description: 'Destination account ID',
  })
  @IsUUID('7')
  @IsNotEmpty()
  receiverAccountId: string;

  @ApiProperty({
    example: '10000.00',
    description: 'Transfer amount in minor units',
  })
  @IsNumericString({
    min: 1,
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({
    example: '50.00',
    description: 'Transaction fee in minor units',
  })
  @IsNumericString({
    min: 1,
    maxDecimalPlaces: 2,
  })
  @IsOptional()
  fee?: string;

  @ApiProperty({
    example: 'TXN-A2A-2026-88492',
    description: 'Unique transaction reference',
  })
  @IsValidReference()
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({
    example: 'Payment for services rendered',
    description: 'Transfer memo/narration',
  })
  @IsString()
  @IsOptional()
  narration?: string;
}
