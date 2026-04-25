import {
  bigint,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { customers } from './customer';
import { accountProducts } from './account_product';
import { Currency, dbCurrencyEnum } from './utils';
import { users } from './user';
import { AccountStatus } from '@database/enums';
import { AccountLoopEntries } from '@database/types';

const accountStatusEnum = pgEnum(
  'account_status',
  Object.values(AccountStatus) as [string, ...string[]],
);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => accountProducts.id),
  status: accountStatusEnum('status').notNull().default(AccountStatus.Pending),
  accountNumber: text('account_number').unique().notNull(),
  reference: text('reference'),
  currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
  balance: bigint('balance', { mode: 'bigint' }).default(0n),
  bookBalance: bigint('book_balance', { mode: 'bigint' }).default(0n), // balance including pending transactions
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  metadata: jsonb('metadata').$type<AccountLoopEntries>().default({}).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
