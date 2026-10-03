import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

import {
  DEFAULT_FEMALE_ACCOUNT_ID,
  DEFAULT_FEMALE_CUSTOMER_ID,
} from '@database';

export class CreateCustomerRespDto {
  @ApiProperty({
    description: 'Unique UUID v7 identifier for the created customer',
    example: DEFAULT_FEMALE_CUSTOMER_ID,
  })
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  customerId: string;

  @ApiPropertyOptional({
    description:
      'Unique UUID v7 identifier for the associated savings account (if requested)',
    example: DEFAULT_FEMALE_ACCOUNT_ID,
  })
  @Expose()
  @IsOptional()
  @IsUUID(7)
  savingsId?: string;
}
