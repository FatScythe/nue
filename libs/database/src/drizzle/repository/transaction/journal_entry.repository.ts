import { Inject, Injectable } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { v7 as uuidv7 } from 'uuid';

import { BaseRepository } from '@database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { JournalEntries } from '@database/drizzle/schemas';
import * as schema from '@database/drizzle/schemas';
import { DBTransaction } from '@database/drizzle/types';

@Injectable()
export class JournalEntryRepository extends BaseRepository<
  typeof JournalEntries
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, JournalEntries);
  }

  async transformAndValidate(
    data: typeof JournalEntries.$inferInsert,
  ): Promise<typeof JournalEntries.$inferInsert> {
    const { tenantId, description, entryDate, createdBy } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'JOURNAL_ENTRY',
      },
    };

    if (!tenantId) {
      throw new Error(
        'Tenant ID is required to record a journal entry',
        errOpt,
      );
    }

    if (!description) {
      throw new Error('Description is required for a journal entry', errOpt);
    }

    if (!entryDate) {
      throw new Error('Entry date is required for a journal entry', errOpt);
    }

    if (!createdBy) {
      throw new Error('Creator User ID is required', errOpt);
    }

    return {
      ...data,
      id: data.id || uuidv7(),
      description: description.trim(),
    };
  }

  /**
   * Fetch a journal entry by ID ensuring tenant isolation.
   */
  async findById(
    tenantId: number,
    id: string,
    tx?: DBTransaction,
  ): Promise<typeof JournalEntries.$inferSelect | null> {
    const client = this.getClient(tx);

    const result = await client
      .select()
      .from(JournalEntries)
      .where(
        and(eq(JournalEntries.tenantId, tenantId), eq(JournalEntries.id, id)),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Fetch journal entries linked to a specific user-facing transaction ID.
   */
  async findByTransactionId(
    tenantId: number,
    transactionId: string,
    tx?: DBTransaction,
  ): Promise<(typeof JournalEntries.$inferSelect)[]> {
    const client = this.getClient(tx);

    return await client
      .select()
      .from(JournalEntries)
      .where(
        and(
          eq(JournalEntries.tenantId, tenantId),
          eq(JournalEntries.transactionId, transactionId),
        ),
      );
  }
}
