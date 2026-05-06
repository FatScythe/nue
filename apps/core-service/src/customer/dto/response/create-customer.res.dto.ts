import { Expose } from 'class-transformer';
import { IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCustomerRespDto {
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  customerId: string;

  @Expose()
  @IsOptional()
  @IsUUID(7)
  savingsId?: string;
}
