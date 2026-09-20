import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

import { IsValidDate, IsValidReference } from '@common';

export class DisburseLoanDto {
  @ApiPropertyOptional({
    description: 'Target account ID where funds will be deposited',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('7')
  @IsNotEmpty()
  @IsString()
  disbursementAccountId: string;

  @ApiPropertyOptional({
    description: 'Target account ID where loans will be repaid from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('7')
  @IsNotEmpty()
  @IsString()
  repaymentAccountId: string;

  @ApiProperty({
    example: '9041',
    description:
      'Target GL Loan Account Code where loan account is disbursed from',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  loanGlCode: string;

  @ApiProperty({
    example: '1010',
    description:
      'Disbursement GL Account Code where principal amount is disbursed to',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsNotEmpty()
  depositGlCode: string;

  @ApiProperty({
    example: '3310',
    description: 'Loan Fees GL Account Code where loan fee is disbursed to',
  })
  @IsValidReference()
  @Length(1, 10)
  @IsOptional()
  feeGlCode?: string;

  @ApiPropertyOptional({
    description: 'Disbursement timestamp override (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsValidDate()
  @IsOptional()
  @IsString()
  disbursementDate?: string;
}
