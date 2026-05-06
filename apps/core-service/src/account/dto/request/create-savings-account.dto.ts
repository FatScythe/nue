import { IsValidDate, IsValidReference } from '@lib/common/src/validators';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSavingsAccountDto {
  @IsOptional()
  @IsBoolean()
  activate: boolean = false;

  @IsOptional()
  @IsValidReference()
  @IsString()
  reference?: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsValidDate()
  @IsOptional()
  createdDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;
}
