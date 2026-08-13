import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus, AccountType } from '@database';
import { PaginationParamDto } from '@common/dto';

export class GetAccountsQueryDto extends PaginationParamDto {
  @ApiPropertyOptional()
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
