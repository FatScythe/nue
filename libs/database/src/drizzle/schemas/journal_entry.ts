import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { JournalEntryStatus } from '@database/drizzle/enums';

import { Businesses } from './business';
import { Offices } from './office';
import { Transactions } from './transaction';
import { Users } from './user';

export const journalEntryStatusEnum = pgEnum(
  'journal_entry_status',
  Object.values(JournalEntryStatus) as [string, ...string[]],
);

export const JournalEntries = pgTable(
  'journal_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => Businesses.id, { onDelete: 'restrict' }),
    transactionId: varchar('transaction_id', { length: 36 }).references(
      () => Transactions.id,
      { onDelete: 'restrict' },
    ), // optional link to user-facing transaction...
    entryDate: timestamp('entry_date', { withTimezone: true }).notNull(),
    description: text('description').notNull(),
    status: journalEntryStatusEnum('status')
      .$type<JournalEntryStatus>()
      .default(JournalEntryStatus.Posted)
      .notNull(),
    createdBy: varchar('created_by', { length: 36 }).references(
      () => Users.id,
      {
        onDelete: 'restrict',
      },
    ),
    approvedBy: varchar('approved_by', { length: 36 }).references(
      () => Users.id,
      { onDelete: 'restrict' },
    ),
    officeId: integer('office_id').references(() => Offices.id, {
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
