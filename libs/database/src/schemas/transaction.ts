import {
  bigint,
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
import { TransactionStatus, TransactionType } from '@database/enums';

export const transactionTypeEnum = pgEnum(
  'transaction_type',
  Object.values(TransactionType) as [string, ...string[]],
);

export const transactionStatusEnum = pgEnum(
  'transaction_status',
  Object.values(TransactionStatus) as [string, ...string[]],
);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  senderAccountId: uuid('sender_account_id')
    .references(() => accounts.id)
    .notNull(),
  receiverAccountId: uuid('receiver_account_id').references(() => accounts.id),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  fee: bigint('fee', { mode: 'bigint' }).default(0n).notNull(),
  currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
  type: transactionTypeEnum('type').default(TransactionType.Transfer).notNull(),
  status: transactionStatusEnum('status').default('pending').notNull(),
  reference: text('reference').unique().notNull(), // external ref...
  narration: text('narration'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
