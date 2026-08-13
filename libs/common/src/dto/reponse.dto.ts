import { PaginationMeta } from '@common/types';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PaginationMetaResponseDto implements PaginationMeta {
  @ApiProperty({ example: 50 })
  @Expose()
  totalRecords: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 10 })
  @Expose()
  limit: number;

  @ApiProperty({ example: 5 })
  @Expose()
  totalPages: number;

  @ApiProperty({ example: null, nullable: true })
  @Expose()
  previous: number | null;

  @ApiProperty({ example: 2, nullable: true })
  @Expose()
  next: number | null;
}
