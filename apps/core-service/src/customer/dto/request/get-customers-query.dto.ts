import { PaginationParamDto } from '@common/dto';
import { CustomerStatus, CustomerType } from '@database';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetCustomersQueryDto extends PaginationParamDto {
  @ApiPropertyOptional({
    description: 'Search by name, email, or phone number',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({
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
