import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsUUID, IsNotEmpty, Length } from 'class-validator';

export class CreateSavingsAcctRespDto {
  @ApiProperty({
    description: 'Unique UUID v7 identifier for the created savings account',
    example: '018f3a5e-5678-7a2b-8123-456789abcdef',
  })
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  savingsId: string;

  @ApiProperty({
    description: 'Generated 10-digit account number',
    example: '0123456789',
    minLength: 10,
    maxLength: 10,
  })
  @Expose()
  @IsNotEmpty()
  @Length(10, 10)
  accountNumber: string;
}
