import { Expose } from 'class-transformer';
import { IsUUID, IsNotEmpty, Length } from 'class-validator';

export class CreateSavingsAcctRespDto {
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  savingsId: string;

  @Expose()
  @IsNotEmpty()
  @Length(10, 10)
  accountNumber: string;
}
