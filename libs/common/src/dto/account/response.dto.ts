import { Expose } from 'class-transformer';

export class AccountRespExampleDto {
  @Expose()
  test: string;
}
