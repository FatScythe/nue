import { CronJobName } from '@libs/database';
import { ProcessLienExpirationDto } from '@libs/background-process';

export enum LienWorkerEnum {
  HandleLienExpiration = CronJobName.HandleLienExpiration,
  ProcessLienExpiration = 'process_lien_expiration',
}

export type LienJobPayloadMap = {
  [LienWorkerEnum.ProcessLienExpiration]: ProcessLienExpirationDto;
  [LienWorkerEnum.HandleLienExpiration]: undefined;
};
