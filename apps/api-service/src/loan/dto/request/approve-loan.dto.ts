import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';

export class ApproveLoanDto {
  @ApiPropertyOptional({
    description: 'Approval notes or commentary from officer',
    example: 'Verified collateral documents and credit score.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
