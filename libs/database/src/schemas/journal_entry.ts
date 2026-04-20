import { bigint, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { generalLedger } from './general_ledger';
import { text } from 'drizzle-orm/pg-core';
import { users } from './user';

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id'),
  glAccountId: uuid('gl_account_id').references(() => generalLedger.id),
  debit: bigint('debit', { mode: 'bigint' }).default(0n).notNull(),
  credit: bigint('credit', { mode: 'bigint' }).default(0n).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
