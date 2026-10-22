import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class PlaceLienRespDto {
  @ApiProperty({ example: '84a3f64c-dc44-7e33-a444-52a0a98a0201' })
  @Expose()
  lienId: number;
}
