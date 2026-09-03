import { uuidv7 } from 'uuidv7';
import * as schema from '../../schemas';
import { LEDGERS_FIXTURE } from '../fixtures/general_ledgers.fixture';

export interface SeedLedgersPayload {
  businessId: number;
  sysAdminId: string;
}

export async function seedGeneralLedgers(tx: any, payload: SeedLedgersPayload) {
  const insertedLedgers: any[] = [];

  for (const ledgerFixture of LEDGERS_FIXTURE) {
    const [ledger] = await tx
      .insert(schema.generalLedgers)
      .values({
        id: uuidv7(),
        tenantId: payload.businessId,
        createdBy: payload.sysAdminId,
        ...ledgerFixture,
      })
      .onConflictDoUpdate({
        target: [schema.generalLedgers.tenantId, schema.generalLedgers.code],
        set: {
          name: ledgerFixture.name,
          category: ledgerFixture.category,
          normalBalance: ledgerFixture.normalBalance,
          allowDirectBooking: ledgerFixture.allowDirectBooking,
          updatedAt: new Date(),
        },
      })
      .returning();

    insertedLedgers.push(ledger);
  }

  return insertedLedgers;
}
