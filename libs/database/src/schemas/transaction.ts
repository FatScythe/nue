import {
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';
import { Currency, dbCurrencyEnum } from './utils';
import { users } from './user';
import { TransactionStatus, TransactionCategory } from '@database/enums';
import { sql } from 'drizzle-orm';
import { offices } from './offices';
import { businesses } from './business';

export const transactionCategoryEnum = pgEnum(
  'transaction_category',
  Object.values(TransactionCategory) as [string, ...string[]],
);

export const transactionStatusEnum = pgEnum(
  'transaction_status',
  Object.values(TransactionStatus) as [string, ...string[]],
);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id, {
      onDelete: 'restrict',
    }),
  senderAccountId: uuid('sender_account_id').references(() => accounts.id, {
    onDelete: 'restrict',
  }),
  receiverAccountId: uuid('receiver_account_id').references(() => accounts.id, {
    onDelete: 'restrict',
  }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  fee: bigint('fee', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
  category: transactionCategoryEnum('category'),
  status: transactionStatusEnum('status').default('pending').notNull(),
  reference: text('reference').unique().notNull(), // external ref...
  narration: text('narration'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }),
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
});
