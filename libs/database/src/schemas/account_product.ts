import {
  boolean,
  decimal,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { Currency, dbCurrencyEnum } from './utils';
import { generalLedger } from './general_ledger';

export enum AccountProducts {
  Savings = 'savings',
  Current = 'current',
  FixedDeposit = 'fixed_deposit',
  Loan = 'loan',
}

const accountProductsEnum = pgEnum(
  'account_product',
  Object.values(AccountProducts) as [string, ...string[]],
);

export const accountProducts = pgTable('account_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => businesses.id),
  name: text('name').notNull(), // e.g., "High Yield Savings"
  code: text('code').notNull(), // e.g., "HYS-001"
  category: accountProductsEnum('category').notNull(),
  glAccountId: uuid('gl_account_id')
    .references(() => generalLedger.id)
    .notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 })
    .default('0.00')
    .notNull(),
  supportedCurrencies: dbCurrencyEnum('supported_currencies')
    .array()
    .notNull()
    .default([Currency.Ngn]),
  allowOverdraft: boolean('allow_overdraft').default(false).notNull(),
  overdraftLimit: decimal('overdraft_limit', { mode: 'bigint' })
    .default(0n)
    .notNull(),
  createdBy: uuid('created_by'), // id of the user or api
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
