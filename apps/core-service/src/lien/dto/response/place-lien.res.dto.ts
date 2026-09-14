import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class PlaceLienRespDto {
  @ApiProperty()
  @Expose()
  lienId: number;
}
