import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateLoanAcctRespDto {
  @ApiProperty({
    description: 'Unique UUID v7 identifier for the created loan account',
    example: '018f3a5e-5678-7a2b-8123-456789abcdef',
  })
  @Expose()
  accountId: string;

  @ApiProperty({
    description: 'Generated 10-digit account number',
    example: '0123456789',
    minLength: 10,
    maxLength: 10,
  })
  @Expose()
  accountNumber: string;
}
