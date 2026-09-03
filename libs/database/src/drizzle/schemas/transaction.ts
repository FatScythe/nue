import {
  pgTable,
  varchar,
  integer,
  text,
  bigint,
  jsonb,
  timestamp,
  pgEnum,
  index,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import {
  TransactionCategory,
  TransactionStatus,
} from '@database/drizzle/enums';
import { Currency, dbCurrencyEnum } from './utils';

import { businesses } from './business';
import { accounts } from './account';
import { users } from './user';
import { offices } from './office';

export const transactionCategoryEnum = pgEnum(
  'transaction_category',
  Object.values(TransactionCategory) as [string, ...string[]],
);

export const transactionStatusEnum = pgEnum(
  'transaction_status',
  Object.values(TransactionStatus) as [string, ...string[]],
);

export const transactions = pgTable(
  'transactions',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    senderAccountId: varchar('sender_account_id', { length: 36 }).references(
      () => accounts.id,
      {
        onDelete: 'restrict',
      },
    ),
    receiverAccountId: varchar('receiver_account_id', {
      length: 36,
    }).references(() => accounts.id, {
      onDelete: 'restrict',
    }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    fee: bigint('fee', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
    category: transactionCategoryEnum('category'),
    status: transactionStatusEnum('status')
      .default(TransactionStatus.Pending)
      .notNull(),
    reference: text('reference').notNull(), // handled via tenant unique index...
    narration: text('narration'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdBy: varchar('created_by', { length: 36 }).references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ), // id of the user or api...
    approvedBy: varchar('approved_by', { length: 36 }).references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ),
    officeId: integer('office_id').references(() => offices.id, {
      onDelete: 'restrict',
    }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // enforce that a transaction must touch at least one valid account...
    atLeastOneAccount: check(
      'chk_transactions_at_least_one_account',
      sql`${table.senderAccountId} IS NOT NULL OR ${table.receiverAccountId} IS NOT NULL`,
    ),
    // enforce unique references per tenant scope...
    tenantReferenceUniqueIdx: uniqueIndex(
      'idx_transactions_tenant_reference_unique',
    ).on(table.tenantId, table.reference),

    // performance indexes for transaction statement queries & lookups...
    senderIdx: index('idx_transactions_sender').on(table.senderAccountId),
    receiverIdx: index('idx_transactions_receiver').on(table.receiverAccountId),
    tenantStatusIdx: index('idx_transactions_tenant_status').on(
      table.tenantId,
      table.status,
    ),
  }),
);
