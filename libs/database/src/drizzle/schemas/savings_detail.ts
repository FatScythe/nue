import {
  bigint,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { Accounts } from './account';
import { Businesses } from './business';
import { GeneralLedgers } from './general_ledger';

export const SavingsDetails = pgTable(
  'savings_details',
  {
    accountId: varchar('account_id', { length: 36 })
      .primaryKey()
      .references(() => Accounts.id, { onDelete: 'restrict' }),

    tenantId: integer('tenant_id')
      .notNull()
      .references(() => Businesses.id, { onDelete: 'restrict' }),

    targetAmount: bigint('target_amount', { mode: 'bigint' }), // nullable for basic deposit Accounts...
    targetDate: timestamp('target_date', { withTimezone: true }), // nullable for basic deposit Accounts...

    withdrawalCountThisMonth: integer('withdrawal_count_this_month')
      .default(0)
      .notNull(),

    lockPeriodEnd: timestamp('lock_period_end', { withTimezone: true }), // nullable for basic deposit Accounts...
    feeIncomeGlAccountId: varchar('fee_income_gl_account_id', {
      length: 36,
    }).references(() => GeneralLedgers.id, { onDelete: 'restrict' }),
  },
  (table) => ({
    tenantIdx: index('idx_savings_details_tenant').on(table.tenantId),
  }),
);
