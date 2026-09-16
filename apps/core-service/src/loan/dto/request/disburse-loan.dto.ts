import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';

import { IsValidDate } from '@common';

export class DisburseLoanDto {
  @ApiPropertyOptional({
    description: 'Target account ID where funds will be deposited',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  disbursementAccountId?: string;

  @ApiPropertyOptional({
    description: 'Disbursement timestamp override (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsValidDate()
  @IsOptional()
  @IsString()
  disbursementDate?: string;
}
