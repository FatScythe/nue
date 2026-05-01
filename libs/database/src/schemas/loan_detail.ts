import {
  bigint,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';
import { businesses } from './business';
import { LoanRepaymentFrequency } from '@database/enums';

export const repaymentFrequencyEnum = pgEnum(
  'repayment_frequency',
  Object.values(LoanRepaymentFrequency) as [string, ...string[]],
);

export const loanDetails = pgTable('loan_details', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'restrict' }),
  tenantId: uuid('tenant_id').references(() => businesses.id, {
    onDelete: 'restrict',
  }),
  principalAmount: bigint('principal_amount', { mode: 'bigint' }).notNull(),
  tenorMonths: integer('tenor_months').notNull(),
  repaymentFrequency: repaymentFrequencyEnum('repayment_frequency')
    .default(LoanRepaymentFrequency.Monthly)
    .notNull(),
  repaymentDay: integer('repayment_day').default(1).notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 })
    .default('0.00')
    .notNull(),
  firstPaymentDate: timestamp('first_payment_date', {
    withTimezone: true,
  }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});
