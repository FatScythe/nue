import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumberString,
  IsEnum,
  IsOptional,
  IsUUID,
  Length,
} from 'class-validator';

import { IsValidReference } from '@common';

export enum TransferDirection {
  AccountToGl = 'account_to_gl',
  GlToAccount = 'gl_to_account',
}

export class AccountGlTransferDto {
  @ApiProperty({
    enum: TransferDirection,
    example: TransferDirection.AccountToGl,
    description: 'Direction of funds movement',
  })
  @IsEnum(TransferDirection)
  @IsNotEmpty()
  direction: TransferDirection;

  @ApiProperty({
    example: '25000.00',
    description: 'Transfer amount in minor units',
  })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    example: '018f3a5e-7a2b-7c8d-9e0f-1a2b3c4d5e6f',
    description: 'Customer account ID',
  })
  @IsUUID('7')
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    example: '0183',
    description: 'Customer deposit liability Gl code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  depositAccountGlCode: string;

  @ApiProperty({
    example: '9041',
    description: 'Target GL Account Code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  glAccountCode: string;

  @ApiProperty({
    example: 'TXN-GL-2026-10492',
    description: 'Unique transaction reference',
  })
  @IsString()
  @IsNotEmpty()
  @IsValidReference()
  reference: string;

  @ApiPropertyOptional({
    example: 'Manual fee assessment',
    description: 'Transfer memo/narration',
  })
  @IsString()
  @IsOptional()
  narration?: string;
}
