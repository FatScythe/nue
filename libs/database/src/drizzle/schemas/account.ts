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
import { sql } from 'drizzle-orm';

import { Currency, dbCurrencyEnum } from './utils';
import { AccountStatus, AccountType } from '@database/drizzle/enums';
import { AccountLoopEntries } from '@database/drizzle/types';

import { businesses } from './business';
import { customers } from './customer';
import { users } from './user';
import { offices } from './office';

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
    tenantId: varchar('tenant_id', { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    type: accountTypeEnum('type').notNull().default(AccountType.Savings),
    status: accountStatusEnum('status')
      .notNull()
      .default(AccountStatus.Pending),
    accountNumber: text('account_number').unique().notNull(),
    accountName: text('account_name').notNull(),
    reference: text('reference'),
    currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
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
  }),
);
