import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceLienRespDto {
  @ApiProperty()
  @Expose()
  lienId: number;
}
