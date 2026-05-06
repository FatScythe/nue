import { Resources, UserType } from '@database/enums';

export type CoreReqUser = {
  id: string;
  secretKey: string | null;
  whitelistedIps: string[] | null;
  type: UserType;
  scopes: Resources[] | null;
  tenantId: string | null;
};
