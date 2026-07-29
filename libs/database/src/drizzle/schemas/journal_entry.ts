import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
  text,
  index,
} from 'drizzle-orm/pg-core';

import { JournalEntryStatus } from '@database/drizzle/enums';

import { users } from './user';
import { transactions } from './transaction';
import { businesses } from './business';
import { offices } from './office';

export const journalEntryStatusEnum = pgEnum(
  'journal_entry_status',
  Object.values(JournalEntryStatus) as [string, ...string[]],
);

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()
    tenantId: varchar('tenant_id', { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    transactionId: varchar('transaction_id', { length: 36 }).references(
      () => transactions.id,
      { onDelete: 'restrict' },
    ), // optional link to user-facing transaction...
    entryDate: timestamp('entry_date', { withTimezone: true }).notNull(),
    description: text('description').notNull(),
    status: journalEntryStatusEnum('status')
      .default(JournalEntryStatus.Posted)
      .notNull(),
    createdBy: varchar('created_by', { length: 36 }).references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ),
    approvedBy: varchar('approved_by', { length: 36 }).references(
      () => users.id,
      { onDelete: 'restrict' },
    ),
    officeId: integer('office_id').references(() => offices.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantEntryDateIdx: index('idx_journal_entries_tenant_date').on(
      table.tenantId,
      table.entryDate,
    ),
    transactionIdx: index('idx_journal_entries_transaction').on(
      table.transactionId,
    ),
  }),
);
