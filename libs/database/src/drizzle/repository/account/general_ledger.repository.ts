import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { generalLedgers } from '@database/drizzle/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { BaseRepository } from '@database/drizzle/base.repository';

import * as schema from '@database/drizzle/schemas';
import { DBTransaction } from '@database/drizzle/types';

@Injectable()
export class GeneralLedgerRepository extends BaseRepository<
  typeof generalLedgers
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, generalLedgers);
  }

  async transformAndValidate(
    data: typeof generalLedgers.$inferInsert,
  ): Promise<typeof generalLedgers.$inferInsert> {
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
    tenantId: string,
    code: string,
    tx?: DBTransaction,
  ): Promise<typeof generalLedgers.$inferSelect | null> {
    const client = this.getClient(tx);

    const result = await client
      .select()
      .from(generalLedgers)
      .where(
        and(
          eq(generalLedgers.tenantId, tenantId),
          eq(generalLedgers.code, code.trim()),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Fetch sub-GL accounts under a given parent GL account.
   */
  async findSubAccounts(
    tenantId: string,
    parentId: string,
    tx?: DBTransaction,
  ): Promise<(typeof generalLedgers.$inferSelect)[]> {
    const client = this.getClient(tx);

    return await client
      .select()
      .from(generalLedgers)
      .where(
        and(
          eq(generalLedgers.tenantId, tenantId),
          eq(generalLedgers.parentId, parentId),
        ),
      );
  }
}
