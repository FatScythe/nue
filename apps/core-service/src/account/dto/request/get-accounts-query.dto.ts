import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationParamDto } from '@libs/common/dto';
import {
  AccountStatus,
  AccountType,
  DEFAULT_BUSINESS_CUSTOMER_ID,
} from '@libs/database';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetAccountsQueryDto extends PaginationParamDto {
  @ApiPropertyOptional({
    description: 'Unique identifier (UUID) of the customer',
    example: DEFAULT_BUSINESS_CUSTOMER_ID,
  })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ enum: AccountType, example: AccountType.Savings })
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @ApiPropertyOptional({ enum: AccountStatus, example: AccountStatus.Closed })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiPropertyOptional({
    description: 'Search by account number or account name',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
