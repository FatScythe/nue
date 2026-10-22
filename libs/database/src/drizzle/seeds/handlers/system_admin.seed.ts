import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import * as schema from '../../schemas';
import { SYS_ADMIN_FIXTURE } from '../fixtures/system_admin.fixture';

export async function seedSystemAdmin(tx: any) {
  // check if a system admin with this email and a null tenant already exists...
  const existingAdmin = await tx.query.Users.findFirst({
    where: and(
      eq(schema.Users.emailAddress, SYS_ADMIN_FIXTURE.emailAddress!),
      isNull(schema.Users.tenantId),
    ),
  });

  if (existingAdmin) {
    // update the existing system admin record...
    const [updatedAdmin] = await tx
      .update(schema.Users)
      .set({
        type: SYS_ADMIN_FIXTURE.type,
        status: SYS_ADMIN_FIXTURE.status,
        firstName: SYS_ADMIN_FIXTURE.firstName,
        lastName: SYS_ADMIN_FIXTURE.lastName,
        isOtpEnabled: SYS_ADMIN_FIXTURE.isOtpEnabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.Users.id, existingAdmin.id))
      .returning();

    return updatedAdmin;
  } else {
    // insert a new system admin with an explicit null tenantId...
    const [newAdmin] = await tx
      .insert(schema.Users)
      .values({
        id: uuidv7(),
        tenantId: null, // explicitly null for system-level users...
        ...SYS_ADMIN_FIXTURE,
      })
      .returning();

    return newAdmin;
  }
}
