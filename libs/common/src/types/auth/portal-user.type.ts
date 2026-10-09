import { UserType } from '@libs/database/drizzle/enums';
import { RolePermissions } from '@libs/database/drizzle/types';

export type PortalReqUser = {
  id: string;
  emailAddress: string | null;
  type: UserType; // 'human' | 'api'
  role: {
    id: string;
    name: string;
    permissions: RolePermissions;
  } | null;
  tenantId: number | null;
};
