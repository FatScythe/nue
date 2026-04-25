import { Permission } from '@database/types';

export type ReqUser = {
  id: string;
  emailAddress: string | null;
  secretKey: string | null;
  whitelistedIps: string[] | null;
  type: string;
  role: {
    id: string;
    name: string;
    permissions: Permission;
  };
};
