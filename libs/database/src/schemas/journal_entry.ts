import { bigint, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { generalLedger } from './general_ledger';
import { text } from 'drizzle-orm/pg-core';
import { users } from './user';
import { transactions } from './transaction';
import { businesses } from './business';
import { sql } from 'drizzle-orm';
import { offices } from './offices';

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => businesses.id)
    .notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  glAccountId: uuid('gl_account_id')
    .references(() => generalLedger.id)
    .notNull(),
  debit: bigint('debit', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  credit: bigint('credit', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  officeId: integer('office_id').references(() => offices.id, {
    onDelete: 'restrict',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
