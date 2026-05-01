import {
  bigint,
  boolean,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';
import { businesses } from './business';

export const fixedDepositDetails = pgTable('fixed_deposit_details', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'restrict' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'restrict' }),
  principalAmount: bigint('principal_amount', { mode: 'bigint' }),
  maturityDate: timestamp('maturity_date').notNull(),
  autoRollover: boolean('auto_rollover').default(false),
  penaltyRate: numeric('penalty_rate').notNull(), // if they withdraw early
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
