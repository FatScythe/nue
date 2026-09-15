import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { AccountStatus, AccountType } from '@database/drizzle/enums';
import { AccountLoopEntries } from '@database/drizzle/types';

import { businesses } from './business';
import { customers } from './customer';
import { offices } from './office';
import { users } from './user';
import { Currency, dbCurrencyEnum } from './utils';

export const accountStatusEnum = pgEnum(
  'account_status',
  Object.values(AccountStatus) as [string, ...string[]],
);

export const accountTypeEnum = pgEnum(
  'account_type',
  Object.values(AccountType) as [string, ...string[]],
);

export const accounts = pgTable(
  'accounts',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    customerId: varchar('customer_id', { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    type: accountTypeEnum('type')
      .$type<AccountType>()
      .notNull()
      .default(AccountType.Savings),
    productId: varchar('product_id', { length: 36 }),
    // .notNull().references(() => accountProducts.id) add once mvp is done...
    status: accountStatusEnum('status')
      .$type<AccountStatus>()
      .notNull()
      .default(AccountStatus.Pending),
    accountNumber: text('account_number').unique().notNull(),
    accountName: text('account_name').notNull(),
    reference: text('reference'),
    currency: dbCurrencyEnum('currency')
      .$type<Currency>()
      .notNull()
      .default(Currency.Ngn),
    balance: bigint('balance', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    bookBalance: bigint('book_balance', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(), // balance including pending transactions...
    createdBy: varchar('created_by', { length: 36 }).references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ), // id of the user or api
    approvedBy: varchar('approved_by', { length: 36 }).references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ), // id of the user or api
    officeId: integer('office_id')
      .references(() => offices.id, {
        onDelete: 'restrict',
      })
      .notNull(),
    metadata: jsonb('metadata')
      .$type<AccountLoopEntries>()
      .default({})
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nubanIdx: index('idx_accounts_tenant_nuban').on(
      table.tenantId,
      sql`(${table.metadata}->>'nuban')`,
    ),
    tenantCustomerIdx: index('idx_accounts_tenant_customer').on(
      table.tenantId,
      table.customerId,
    ),
    tenantStatusIdx: index('idx_accounts_tenant_status').on(
      table.tenantId,
      table.status,
    ),
    // balanceLteBookBalance: check(
    //   'chk_accounts_balance_lte_book_balance',
    //   sql`${table.balance} <= ${table.bookBalance}`,
    // ),
    // balanceNonNegative: check(
    //   'chk_accounts_balance_non_negative',
    //   sql`${table.balance} >= 0`,
    // ),
    // bookBalanceNonNegative: check(
    //   'chk_accounts_book_balance_non_negative',
    //   sql`${table.bookBalance} >= 0`,
    // ),
  }),
);
