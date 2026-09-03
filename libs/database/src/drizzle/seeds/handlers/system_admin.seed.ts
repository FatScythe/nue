import { uuidv7 } from 'uuidv7';
import * as schema from '../../schemas';
import { SYS_ADMIN_FIXTURE } from '../fixtures/system_admin.fixture';

export async function seedSystemAdmin(tx: any) {
  const [sysAdmin] = await tx
    .insert(schema.users)
    .values({
      id: uuidv7(),
      ...SYS_ADMIN_FIXTURE,
    })
    .onConflictDoUpdate({
      target: [schema.users.tenantId, schema.users.emailAddress], // composite target...
      set: {
        type: SYS_ADMIN_FIXTURE.type,
        status: SYS_ADMIN_FIXTURE.status,
        firstName: SYS_ADMIN_FIXTURE.firstName,
        lastName: SYS_ADMIN_FIXTURE.lastName,
        isOtpEnabled: SYS_ADMIN_FIXTURE.isOtpEnabled,
        updatedAt: new Date(),
      },
    })
    .returning();

  return sysAdmin;
}
