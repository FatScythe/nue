import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  LoanRepaymentFrequency,
  LoanStatus,
  MoratoriumType,
} from '@database/drizzle/enums';

import { accounts } from './account';
import { businesses } from './business';

export const repaymentFrequencyEnum = pgEnum(
  'repayment_frequency',
  Object.values(LoanRepaymentFrequency) as [string, ...string[]],
);

export const loanStatusEnum = pgEnum(
  'loan_status',
  Object.values(LoanStatus) as [string, ...string[]],
);

export const moratoriumTypeEnum = pgEnum(
  'moratorium_type',
  Object.values(MoratoriumType) as [string, ...string[]],
);

export const loanDetails = pgTable(
  'loan_details',
  {
    accountId: varchar('account_id', { length: 36 })
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    tenantId: varchar('tenant_id', { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    principalAmount: bigint('principal_amount', { mode: 'bigint' }).notNull(),
    outstandingBalance: bigint('outstanding_balance', {
      mode: 'bigint',
    }).notNull(),
    tenor: integer('tenor').notNull(), // tenor in months/days...
    repaymentFrequency: repaymentFrequencyEnum('repayment_frequency')
      .default(LoanRepaymentFrequency.Monthly)
      .notNull(),
    interestRate: numeric('interest_rate', { precision: 5, scale: 2 })
      .default('0.00')
      .notNull(),
    status: loanStatusEnum('status').default(LoanStatus.Active).notNull(),
    processingFee: bigint('processing_fee', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    moratoriumType: moratoriumTypeEnum('moratorium_type')
      .default(MoratoriumType.None)
      .notNull(),
    moratoriumPeriod: integer('moratorium_period').default(0).notNull(),
    repaymentStartDate: timestamp('repayment_start_date', {
      withTimezone: true,
    }).notNull(),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('idx_loan_details_tenant').on(table.tenantId),
  }),
);
