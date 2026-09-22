import { Inject, Injectable } from '@nestjs/common';

import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { v7 as uuidv7 } from 'uuid';

import { BaseRepository } from '@database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { JournalEntryLines } from '@database/drizzle/schemas';
import * as schema from '@database/drizzle/schemas';
import { DBTransaction } from '@database/drizzle/types';

@Injectable()
export class JournalEntryLineRepository extends BaseRepository<
  typeof JournalEntryLines
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, JournalEntryLines);
  }

  async transformAndValidate(
    data: typeof JournalEntryLines.$inferInsert,
  ): Promise<typeof JournalEntryLines.$inferInsert> {
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
    lines: (typeof JournalEntryLines.$inferInsert)[],
    tx?: DBTransaction,
  ): Promise<(typeof JournalEntryLines.$inferSelect)[]> {
    const client = this.getClient(tx);

    const validatedLines = await Promise.all(
      lines.map((line) => this.transformAndValidate(line)),
    );

    return await client
      .insert(JournalEntryLines)
      .values(validatedLines)
      .returning();
  }

  /**
   * Retrieve all line items for a given journal entry.
   */
  async findByJournalEntryId(
    journalEntryId: string,
    tx?: DBTransaction,
  ): Promise<(typeof JournalEntryLines.$inferSelect)[]> {
    const client = this.getClient(tx);

    return await client
      .select()
      .from(JournalEntryLines)
      .where(eq(JournalEntryLines.journalEntryId, journalEntryId));
  }
}
