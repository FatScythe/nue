import {
  bigint,
  boolean,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';

export const fixedDepositDetails = pgTable('fixed_deposit_details', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id),
  principalAmount: bigint('principal_amount', { mode: 'bigint' }),
  maturityDate: timestamp('maturity_date').notNull(),
  autoRollover: boolean('auto_rollover').default(false),
  penaltyRate: numeric('penalty_rate'), // if they withdraw early
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
