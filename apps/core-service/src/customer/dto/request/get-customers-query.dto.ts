import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationParamDto } from '@libs/common/dto';
import { CustomerStatus, CustomerType } from '@libs/database';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetCustomersQueryDto extends PaginationParamDto {
  @ApiPropertyOptional({
    example: 'JOHN DO...',
    description: 'Search by name, email, or phone number',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ example: CustomerType.Individual, enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({
    example: CustomerStatus.Active,
    enum: [
      CustomerStatus.Active,
      CustomerStatus.Deactivated,
      CustomerStatus.Frozen,
    ],
  })
  @IsOptional()
  @IsEnum([
    CustomerStatus.Active,
    CustomerStatus.Deactivated,
    CustomerStatus.Frozen,
  ])
  status?:
    | CustomerStatus.Active
    | CustomerStatus.Deactivated
    | CustomerStatus.Frozen;
}
