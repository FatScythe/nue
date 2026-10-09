import { Inject, Injectable } from '@nestjs/common';

import { BaseRepository } from '@libs/database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@libs/database/drizzle/drizzle.provider';
import { GeneralLedgers } from '@libs/database/drizzle/schemas';
import * as schema from '@libs/database/drizzle/schemas';
import { DBTransaction } from '@libs/database/drizzle/types';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class GeneralLedgerRepository extends BaseRepository<
  typeof GeneralLedgers
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, GeneralLedgers);
  }

  async transformAndValidate(
    data: typeof GeneralLedgers.$inferInsert,
  ): Promise<typeof GeneralLedgers.$inferInsert> {
    const { tenantId, name, code, category, normalBalance, createdBy } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'GENERAL_LEDGER',
      },
    };

    if (!tenantId) {
      throw new Error(
        'Tenant ID is required to create a General Ledger account',
        errOpt,
      );
    }

    if (!code) {
      throw new Error('GL Code is required for General Ledger account', errOpt);
    }

    if (!name) {
      throw new Error('GL account name is required', errOpt);
    }

    if (!category) {
      throw new Error('GL category is required', errOpt);
    }

    if (!normalBalance) {
      throw new Error('Normal balance (DEBIT/CREDIT) is required', errOpt);
    }

    if (!createdBy) {
      throw new Error('Creator User ID is required', errOpt);
    }

    return {
      ...data,
      id: data.id || uuidv7(),
      name: name.trim(),
      code: code.trim(),
    };
  }

  /**
   * Find GL account by unique tenant ID and GL code combination.
   */
  async findByCode(
    tenantId: number,
    code: string,
    tx?: DBTransaction,
  ): Promise<typeof GeneralLedgers.$inferSelect | null> {
    const client = this.getClient(tx);

    const result = await client
      .select()
      .from(GeneralLedgers)
      .where(
        and(
          eq(GeneralLedgers.tenantId, tenantId),
          eq(GeneralLedgers.code, code.trim()),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Fetch sub-GL accounts under a given parent GL account.
   */
  async findSubAccounts(
    tenantId: number,
    parentId: string,
    tx?: DBTransaction,
  ): Promise<(typeof GeneralLedgers.$inferSelect)[]> {
    const client = this.getClient(tx);

    return await client
      .select()
      .from(GeneralLedgers)
      .where(
        and(
          eq(GeneralLedgers.tenantId, tenantId),
          eq(GeneralLedgers.parentId, parentId),
        ),
      );
  }
}
