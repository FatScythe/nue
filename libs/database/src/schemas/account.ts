import {
  bigint,
  boolean,
  integer,
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
import { sql } from 'drizzle-orm';
import { savingsPools } from './savings_pool';
import { offices } from './offices';

export const accountStatusEnum = pgEnum(
  'account_status',
  Object.values(AccountStatus) as [string, ...string[]],
);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'restrict' }),
  productId: integer('product_id')
    .notNull()
    .references(() => accountProducts.id, { onDelete: 'restrict' }),
  status: accountStatusEnum('status').notNull().default(AccountStatus.Pending),
  accountNumber: text('account_number').unique().notNull(),
  accountName: text('account_name').notNull(),
  reference: text('reference'),
  isPooled: boolean('is_pooled').default(false).notNull(),
  poolId: uuid('pool_id').references(() => savingsPools.id, {
    onDelete: 'restrict',
  }),
  currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
  balance: bigint('balance', { mode: 'bigint' }).default(sql`0`),
  bookBalance: bigint('book_balance', { mode: 'bigint' }).default(sql`0`), // balance including pending transactions
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  officeId: integer('office_id').references(() => offices.id, {
    onDelete: 'restrict',
  }),
  metadata: jsonb('metadata').$type<AccountLoopEntries>().default({}).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
