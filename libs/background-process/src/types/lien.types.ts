import { ProcessLienExpirationDto } from '@libs/background-process';
import { CronJobName } from '@libs/database';

export enum LienWorkerEnum {
  HandleLienExpiration = CronJobName.HandleLienExpiration,
  ProcessLienExpiration = 'process_lien_expiration',
}

export type LienJobPayloadMap = {
  [LienWorkerEnum.ProcessLienExpiration]: ProcessLienExpirationDto;
  [LienWorkerEnum.HandleLienExpiration]: undefined;
};
