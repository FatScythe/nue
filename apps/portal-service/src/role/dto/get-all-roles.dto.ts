import { IsOptional, IsString } from 'class-validator';

import { PaginationParamDto } from '@libs/common/dto';

export class GetAllRoles extends PaginationParamDto {
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  search?: string;
}
