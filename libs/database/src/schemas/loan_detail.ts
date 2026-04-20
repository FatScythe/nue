import {
  bigint,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';

export const loanDetails = pgTable('loan_details', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id),
  principalAmount: bigint('principal_amount', { mode: 'bigint' }).notNull(),
  tenorMonths: integer('tenor_months').notNull(),
  repaymentFrequency: text('repayment_frequency').default('monthly').notNull(),
  repaymentDay: integer('repayment_day').default(1).notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 }).notNull(),
  firstPaymentDate: timestamp('first_payment_date').notNull(),
  closedAt: timestamp('closed_at'),
});
