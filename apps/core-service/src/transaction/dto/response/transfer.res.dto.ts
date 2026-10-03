import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class TransferResp {
  @ApiProperty({ example: '87u0f64c-dc44-7e33-a444-52a0a98a0201' })
  @Expose()
  transactionId: string;

  @ApiProperty({ example: '01a0jk3c-ef44-7e33-a444-52a0a98a0201' })
  @Expose()
  journalId: string;
}
