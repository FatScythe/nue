import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { journalEntries } from '@database/drizzle/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { BaseRepository } from '@database/drizzle/base.repository';
import { DBTransaction } from '@database/drizzle/types';

import * as schema from '@database/drizzle/schemas';

@Injectable()
export class JournalEntryRepository extends BaseRepository<
  typeof journalEntries
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, journalEntries);
  }

  async transformAndValidate(
    data: typeof journalEntries.$inferInsert,
  ): Promise<typeof journalEntries.$inferInsert> {
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
    tenantId: string,
    id: string,
    tx?: DBTransaction,
  ): Promise<typeof journalEntries.$inferSelect | null> {
    const client = this.getClient(tx);

    const result = await client
      .select()
      .from(journalEntries)
      .where(
        and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.id, id)),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Fetch journal entries linked to a specific user-facing transaction ID.
   */
  async findByTransactionId(
    tenantId: string,
    transactionId: string,
    tx?: DBTransaction,
  ): Promise<(typeof journalEntries.$inferSelect)[]> {
    const client = this.getClient(tx);

    return await client
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.transactionId, transactionId),
        ),
      );
  }
}
