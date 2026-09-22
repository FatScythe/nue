import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { Businesses } from './business';
import { GeneralLedgers } from './general_ledger';
import { JournalEntries } from './journal_entry';

export const JournalEntryLines = pgTable(
  'journal_entry_lines',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => Businesses.id, { onDelete: 'restrict' }),
    journalEntryId: varchar('journal_entry_id', { length: 36 })
      .notNull()
      .references(() => JournalEntries.id, { onDelete: 'cascade' }),
    glAccountId: varchar('gl_account_id', { length: 36 })
      .notNull()
      .references(() => GeneralLedgers.id, { onDelete: 'restrict' }),
    debit: bigint('debit', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    credit: bigint('credit', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    description: text('description'), // line-specific memo...
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // ensures a line is either a pure debit or a pure credit, not both or neither...
    debitOrCreditCheck: check(
      'chk_debit_xor_credit',
      sql`(${table.debit} > 0 AND ${table.credit} = 0) OR (${table.credit} > 0 AND ${table.debit} = 0)`,
    ),
    glAccountIdx: index('idx_journal_lines_gl_account').on(table.glAccountId),
    entryIdx: index('idx_journal_lines_entry').on(table.journalEntryId),
  }),
);
