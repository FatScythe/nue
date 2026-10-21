import { RolePermissions } from '@libs/database/drizzle/types';

export type PortalReqUser = {
  sub: string;
  emailAddress: string | null;
  role: {
    id: string;
    name: string;
    permissions: RolePermissions;
  } | null;
  tenantId: number | null;
  jti: string | null;
};
