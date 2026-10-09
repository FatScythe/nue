import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsValidDate, IsValidReference } from '@libs/common';
import { DEFAULT_MALE_ACCOUNT_ID } from '@libs/database';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class DisburseLoanDto {
  @ApiPropertyOptional({
    description: 'Target account ID where funds will be deposited',
    example: DEFAULT_MALE_ACCOUNT_ID,
  })
  @IsUUID('7')
  @IsOptional()
  @IsString()
  disbursementAccountId?: string;

  @ApiPropertyOptional({
    description: 'Target account ID where loans will be repaid from',
    example: DEFAULT_MALE_ACCOUNT_ID,
  })
  @IsUUID('7')
  @IsOptional()
  @IsString()
  repaymentAccountId?: string;

  @ApiPropertyOptional({
    description: 'GL Code for upfront loan fee revenue override',
    example: 'FE4001',
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
