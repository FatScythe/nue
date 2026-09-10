import { ProcessLienExpirationDto } from '@background-process/dto';
import { CronJobName } from '@database';

export enum LienWorkerEnum {
  HandleLienExpiration = CronJobName.HandleLienExpiration,
  ProcessLienExpiration = 'process_lien_expiration',
}

export type LienJobPayloadMap = {
  [LienWorkerEnum.ProcessLienExpiration]: ProcessLienExpirationDto;
  [LienWorkerEnum.HandleLienExpiration]: undefined;
};
