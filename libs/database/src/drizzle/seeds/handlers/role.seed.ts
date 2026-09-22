import { uuidv7 } from 'uuidv7';

import { rebuildPermission } from '@common';

import * as schema from '../../schemas';

export interface SeedRolePayload {
  sysAdminId: string;
}

export async function seedCoreRoles(tx: any, payload: SeedRolePayload) {
  const [role] = await tx
    .insert(schema.Roles)
    .values({
      id: uuidv7(),
      tenantId: null,
      permissions: rebuildPermission({}, true),
      name: 'core admin role',
      createdBy: payload.sysAdminId,
      approvedBy: payload.sysAdminId,
    })
    .onConflictDoUpdate({
      target: [schema.Roles.name, schema.Roles.tenantId],
      set: {
        permissions: rebuildPermission({}, true),
        updatedAt: new Date(),
      },
    })
    .returning();

  return role;
}
