import { ApiProperty } from '@nestjs/swagger';

import { IsString } from 'class-validator';

export class DeclineLoanDto {
  @ApiProperty({
    description: 'Reason for declining the loan application',
    example: 'Debt-to-income ratio exceeds permissible threshold.',
  })
  @IsString()
  reason: string;
}
