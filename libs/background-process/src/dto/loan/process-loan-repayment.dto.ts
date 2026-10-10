import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class ProcessLoanRepaymentDto {
  @IsUUID('7')
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  @IsNotEmpty()
  tenantId: number;
}
