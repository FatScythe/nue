import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { accounts } from './account';
import { businesses } from './business';

export const savingsDetails = pgTable(
  'savings_details',
  {
    accountId: varchar('account_id', { length: 36 })
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'restrict' }),

    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),

    targetAmount: bigint('target_amount', { mode: 'bigint' }), // nullable for basic deposit accounts...
    targetDate: timestamp('target_date', { withTimezone: true }), // nullable for basic deposit accounts...

    withdrawalCountThisMonth: integer('withdrawal_count_this_month')
      .default(0)
      .notNull(),

    lockPeriodEnd: timestamp('lock_period_end', { withTimezone: true }), // nullable for basic deposit accounts...
  },
  (table) => ({
    tenantIdx: index('idx_savings_details_tenant').on(table.tenantId),
  }),
);
