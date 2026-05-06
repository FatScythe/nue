import { UserType } from '@database/enums';
import { Permission } from '@database/types';

export type PortalReqUser = {
  id: string;
  emailAddress: string | null;
  type: UserType; // 'human' | 'api'

  role: {
    id: string;
    name: string;
    permissions: Permission;
  } | null;
  tenantId: string | null;
};
