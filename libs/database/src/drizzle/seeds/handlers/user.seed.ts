import { uuidv7 } from 'uuidv7';
import * as schema from '../../schemas';
import { UserStatus, UserType } from '../../enums';
import { DEFAULT_API_KEY } from '../../database.constant';
import { ApiScope, validScopes } from '../../types';

export interface SeedUsersPayload {
  businessId: number;
  sysAdminId: string;
  roleId: string;
}

export async function seedBusinessUsers(tx: any, payload: SeedUsersPayload) {
  // human user...
  const [humanUser] = await tx
    .insert(schema.users)
    .values({
      id: uuidv7(),
      tenantId: payload.businessId,
      type: UserType.Human,
      status: UserStatus.Active,
      firstName: 'Core',
      lastName: 'Human',
      emailAddress: 'human@nuecore.com',
      roleId: payload.roleId,
      ipWhitelist: [],
      isOtpEnabled: false,
      createdBy: payload.sysAdminId,
      approvedBy: payload.sysAdminId,
    })
    .onConflictDoUpdate({
      target: [schema.users.tenantId, schema.users.emailAddress], // composite target...
      set: {
        tenantId: payload.businessId,
        roleId: payload.roleId,
        status: UserStatus.Active,
        firstName: 'Core',
        lastName: 'Human',
        updatedAt: new Date(),
      },
    })
    .returning();

  // api user...
  const [apiUser] = await tx
    .insert(schema.users)
    .values({
      id: uuidv7(),
      tenantId: payload.businessId,
      type: UserType.Api,
      status: UserStatus.Active,
      firstName: 'Core',
      lastName: 'Engine',
      emailAddress: 'api@nuecore.com',
      secretKey: DEFAULT_API_KEY,
      scopes: validScopes as unknown as ApiScope[],
      ipWhitelist: [],
      isOtpEnabled: false,
      createdBy: humanUser.id,
      approvedBy: humanUser.id,
    })
    .onConflictDoUpdate({
      target: [schema.users.tenantId, schema.users.emailAddress], // composite target...
      set: {
        tenantId: payload.businessId,
        status: UserStatus.Active,
        secretKey: DEFAULT_API_KEY,
        scopes: validScopes as unknown as ApiScope[],
        updatedAt: new Date(),
      },
    })
    .returning();

  return { humanUser, apiUser };
}
