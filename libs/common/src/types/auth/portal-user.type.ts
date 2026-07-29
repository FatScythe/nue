import { UserType } from '@database/drizzle/enums';
import { RolePermissions } from '@database/drizzle/types';

export type PortalReqUser = {
  id: string;
  emailAddress: string | null;
  type: UserType; // 'human' | 'api'
  role: {
    id: string;
    name: string;
    permissions: RolePermissions;
  } | null;
  tenantId: string | null;
};
