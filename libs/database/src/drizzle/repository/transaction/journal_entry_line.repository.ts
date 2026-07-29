import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { journalEntryLines } from '@database/drizzle/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { BaseRepository } from '@database/drizzle/base.repository';
import { DBTransaction } from '@database/drizzle/types';

import * as schema from '@database/drizzle/schemas';

@Injectable()
export class JournalEntryLineRepository extends BaseRepository<
  typeof journalEntryLines
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, journalEntryLines);
  }

  async transformAndValidate(
    data: typeof journalEntryLines.$inferInsert,
  ): Promise<typeof journalEntryLines.$inferInsert> {
    const { journalEntryId, glAccountId, debit, credit, description } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'JOURNAL_ENTRY_LINE',
      },
    };

    if (!journalEntryId) {
      throw new Error('Journal Entry ID is required for a line item', errOpt);
    }

    if (!glAccountId) {
      throw new Error('GL Account ID is required for a line item', errOpt);
    }

    const debitVal = BigInt(debit ?? 0n);
    const creditVal = BigInt(credit ?? 0n);

    // Enforce XOR constraint: must be pure debit OR pure credit
    const isPureDebit = debitVal > 0n && creditVal === 0n;
    const isPureCredit = creditVal > 0n && debitVal === 0n;

    if (!isPureDebit && !isPureCredit) {
      throw new Error(
        'A journal line must have either debit > 0 or credit > 0, but not both or neither',
        errOpt,
      );
    }

    return {
      ...data,
      id: data.id || uuidv7(),
      debit: debitVal,
      credit: creditVal,
      description: description ? description.trim() : null,
    };
  }

  /**
   * Bulk insert multiple journal entry lines within a transaction.
   */
  async createMany(
    lines: (typeof journalEntryLines.$inferInsert)[],
    tx?: DBTransaction,
  ): Promise<(typeof journalEntryLines.$inferSelect)[]> {
    const client = this.getClient(tx);

    const validatedLines = await Promise.all(
      lines.map((line) => this.transformAndValidate(line)),
    );

    return await client
      .insert(journalEntryLines)
      .values(validatedLines)
      .returning();
  }

  /**
   * Retrieve all line items for a given journal entry.
   */
  async findByJournalEntryId(
    journalEntryId: string,
    tx?: DBTransaction,
  ): Promise<(typeof journalEntryLines.$inferSelect)[]> {
    const client = this.getClient(tx);

    return await client
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, journalEntryId));
  }
}
