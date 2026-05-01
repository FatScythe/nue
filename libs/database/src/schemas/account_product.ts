import {
  boolean,
  decimal,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { Currency, dbCurrencyEnum } from './utils';
import { generalLedger } from './general_ledger';
import { sql } from 'drizzle-orm';
import { AccountProducts, AccountProductStatus } from '@database/enums';
import { users } from './user';

export const accountProductsEnum = pgEnum(
  'account_product',
  Object.values(AccountProducts) as [string, ...string[]],
);

export const accountProductStatusEnum = pgEnum(
  'account_product_status',
  Object.values(AccountProductStatus) as [string, ...string[]],
);

export const accountProducts = pgTable('account_products', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => businesses.id, {
      onDelete: 'restrict',
    })
    .notNull(),
  name: text('name').notNull(), // e.g., "High Yield Savings"
  code: text('code').notNull(), // e.g., "HYS-001"
  category: accountProductsEnum('category').notNull(),
  status: accountProductStatusEnum('status').notNull(),
  minBalance: decimal('min_balance', { precision: 20, scale: 2 }).default(
    '0.00',
  ),
  glAccountId: uuid('gl_account_id')
    .references(() => generalLedger.id)
    .notNull(),
  enablePooling: boolean('enable_pooling').default(false).notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 })
    .default('0.00')
    .notNull(),
  supportedCurrencies: dbCurrencyEnum('supported_currencies')
    .array()
    .notNull()
    .default([Currency.Ngn]),
  allowOverdraft: boolean('allow_overdraft').default(false).notNull(),
  overdraftLimit: decimal('overdraft_limit', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
