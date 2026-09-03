import { uuidv7 } from 'uuidv7';
import * as schema from '../../schemas';
import { rebuildPermission } from '@common';

export interface SeedRolePayload {
  sysAdminId: string;
}

export async function seedCoreRoles(tx: any, payload: SeedRolePayload) {
  const [role] = await tx
    .insert(schema.roles)
    .values({
      id: uuidv7(),
      tenantId: null,
      permissions: rebuildPermission({}, true),
      name: 'core admin role',
      createdBy: payload.sysAdminId,
      approvedBy: payload.sysAdminId,
    })
    .onConflictDoUpdate({
      target: [schema.roles.name, schema.roles.tenantId],
      set: {
        permissions: rebuildPermission({}, true),
        updatedAt: new Date(),
      },
    })
    .returning();

  return role;
}
