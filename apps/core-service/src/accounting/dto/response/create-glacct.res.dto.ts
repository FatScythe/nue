import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateGlAccountRespDto {
  @Expose()
  @ApiProperty()
  glCode: string;
}
