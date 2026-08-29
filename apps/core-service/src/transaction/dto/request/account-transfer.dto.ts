import { isNumber, IsValidReference } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsUUID,
  ValidateIf,
  Length,
} from 'class-validator';

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
    example: '0183',
    description: 'Customer deposit liability Gl code',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  depositGlCode: string;

  @ApiProperty({
    example: '10000.00',
    description: 'Transfer amount in minor units',
  })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({
    example: '0183',
    description: 'Deposit Fee Gl code, must be available if fee is passed',
  })
  @ValidateIf((dto) => dto?.fee && isNumber(dto.fee))
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  feeGlCode?: string;

  @ApiPropertyOptional({
    example: '50.00',
    description: 'Transaction fee in minor units',
  })
  @IsNumberString()
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
