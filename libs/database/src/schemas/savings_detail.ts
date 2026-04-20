import { bigint, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './account';

export const savingsDetails = pgTable('savings_details', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id),
  targetAmount: bigint('target_amount', { mode: 'bigint' }),
  targetDate: timestamp('target_date'),
  withdrawalCountThisMonth: integer('withdrawal_count').default(0).notNull(),
  lockPeriodEnd: timestamp('lock_period_end'),
});
