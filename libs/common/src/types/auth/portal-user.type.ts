import { UserStatus } from '@libs/database';
import { RolePermissions } from '@libs/database/drizzle/types';

export type PortalReqUser = {
  sub: string;
  status: UserStatus;
  emailAddress: string | null;
  role: {
    id: string;
    name: string;
    permissions: RolePermissions;
  } | null;
  tenantId: number | null;
  jti: string | null;
  // 👇🏾 only  available on endpoint with @PermissionGuard()
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  otpKey?: string | null;
};
