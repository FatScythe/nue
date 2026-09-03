import { UserType } from '@database/drizzle/enums';
import { ApiScope } from '@database/drizzle/types';

export type CoreReqUser = {
  id: string;
  secretKey: string | null;
  whitelistedIps: string[] | null;
  type: UserType;
  scopes: ApiScope[] | null;
  tenantId: number | null;
};
