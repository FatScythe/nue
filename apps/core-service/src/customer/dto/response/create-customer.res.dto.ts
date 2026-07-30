import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCustomerRespDto {
  @ApiProperty({
    description: 'Unique UUID v7 identifier for the created customer',
    example: '018f3a5e-1234-7a2b-8123-456789abcdef',
  })
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  customerId: string;

  @ApiPropertyOptional({
    description:
      'Unique UUID v7 identifier for the associated savings account (if requested)',
    example: '018f3a5e-5678-7a2b-8123-456789abcdef',
  })
  @Expose()
  @IsOptional()
  @IsUUID(7)
  savingsId?: string;
}
