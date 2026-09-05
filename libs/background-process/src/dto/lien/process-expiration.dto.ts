import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class ProcessLienExpirationDto {
  @IsUUID('7')
  @IsString()
  @IsNotEmpty()
  lienId: string;

  @IsUUID('7')
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  @IsNotEmpty()
  tenantId: number;
}
