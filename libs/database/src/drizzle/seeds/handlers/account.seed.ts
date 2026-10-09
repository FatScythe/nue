import { Accounts } from '@libs/database/drizzle/schemas';
import { uuidv7 } from 'uuidv7';

import { ACCOUNTS_FIXTURE } from '../fixtures/accounts.fixture';

export async function seedAccounts(
  tx: any,
  payload: {
    tenantId: number;
    officeId: number;
    controlGlAccountId: string;
  },
) {
  const records = ACCOUNTS_FIXTURE.map((account) => ({
    ...account,
    tenantId: payload.tenantId,
    officeId: payload.officeId,
    controlGlAccountId: payload.controlGlAccountId,
  }));

  const insertedAccounts = await tx
    .insert(Accounts)
    .values(records)
    .onConflictDoUpdate({
      target: Accounts.accountNumber,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning();

  return insertedAccounts;
}
