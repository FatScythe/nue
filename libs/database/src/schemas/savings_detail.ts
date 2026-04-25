import { bigint, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './account';
import { businesses } from './business';

export const savingsDetails = pgTable('savings_details', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id),
  tenantId: uuid('tenant_id').references(() => businesses.id),
  targetAmount: bigint('target_amount', { mode: 'bigint' }).notNull(),
  targetDate: timestamp('target_date', { withTimezone: true }),
  withdrawalCountThisMonth: integer('withdrawal_count').default(0).notNull(),
  lockPeriodEnd: timestamp('lock_period_end', { withTimezone: true }),
});
