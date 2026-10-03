import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class CreateGlAccountRespDto {
  @ApiProperty({ example: '3310' })
  @Expose()
  glCode: string;
}
