import { ProcessLienExpirationDto } from '@background-process/dto';

export enum LienWorkerEnum {
  ProcessLienExpiration = 'process_lien_expiration',
}

export type LienJobPayloadMap = {
  [LienWorkerEnum.ProcessLienExpiration]: ProcessLienExpirationDto;
};
