import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ActivateAccountRespDto {
  @ApiProperty()
  @Expose()
  message: string;
}
