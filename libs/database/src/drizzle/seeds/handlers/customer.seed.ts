import { Customers } from '@database/drizzle/schemas';

import { CUSTOMERS_FIXTURE } from '../fixtures/customers.fixture';

export async function seedCustomers(
  tx: any,
  payload: { tenantId: number; officeId: number },
) {
  const records = CUSTOMERS_FIXTURE.map((customer) => ({
    ...customer,
    tenantId: payload.tenantId,
    officeId: payload.officeId,
  }));

  const insertedCustomers = await tx
    .insert(Customers)
    .values(records)
    .onConflictDoUpdate({
      target: Customers.id,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning();

  return insertedCustomers;
}
