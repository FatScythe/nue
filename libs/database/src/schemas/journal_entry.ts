import { bigint, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { generalLedger } from './general_ledger';
import { text } from 'drizzle-orm/pg-core';
import { users } from './user';
import { transactions } from './transaction';
import { businesses } from './business';

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => businesses.id)
    .notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  glAccountId: uuid('gl_account_id')
    .references(() => generalLedger.id)
    .notNull(),
  debit: bigint('debit', { mode: 'bigint' }).default(0n).notNull(),
  credit: bigint('credit', { mode: 'bigint' }).default(0n).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
