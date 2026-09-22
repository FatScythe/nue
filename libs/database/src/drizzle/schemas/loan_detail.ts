import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  ChargeCalculationType,
  ChargeTime,
  LoanRepaymentFrequency,
  LoanStatus,
  MoratoriumType,
} from '@database/drizzle/enums';

import { Accounts } from './account';
import { Businesses } from './business';
import { GeneralLedgers } from './general_ledger';

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

export const chargeCalculationTypeEnum = pgEnum(
  'charge_type',
  Object.values(ChargeCalculationType) as [string, ...string[]],
);

export const chargeTimeEnum = pgEnum(
  'charge_time',
  Object.values(ChargeTime) as [string, ...string[]],
);

export const LoanDetails = pgTable(
  'loan_details',
  {
    accountId: varchar('account_id', { length: 36 })
      .primaryKey()
      .references(() => Accounts.id, { onDelete: 'restrict' }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => Businesses.id, { onDelete: 'restrict' }),
    disbursementAccountId: varchar('disbursement_account_id', {
      length: 36,
    }).references(() => Accounts.id, { onDelete: 'restrict' }),
    repaymentAccountId: varchar('repayment_account_id', {
      length: 36,
    }).references(() => Accounts.id, { onDelete: 'restrict' }),
    principalAmount: bigint('principal_amount', { mode: 'bigint' }).notNull(),
    outstandingBalance: bigint('outstanding_balance', {
      mode: 'bigint',
    }).notNull(),
    tenor: integer('tenor').notNull(), // tenor in months/days...
    repaymentFrequency: repaymentFrequencyEnum('repayment_frequency')
      .default(LoanRepaymentFrequency.Monthly)
      .$type<LoanRepaymentFrequency>()
      .notNull(),
    interestRate: numeric('interest_rate', { precision: 5, scale: 2 })
      .default('0.00')
      .notNull(),
    status: loanStatusEnum('status')
      .default(LoanStatus.Active)
      .$type<LoanStatus>()
      .notNull(),
    chargeCalculationType: chargeCalculationTypeEnum('charge_calculation_type')
      .$type<ChargeCalculationType>()
      .default(ChargeCalculationType.Fixed)
      .notNull(),
    chargeTime: chargeTimeEnum('charge_time')
      .$type<ChargeTime>()
      .default(ChargeTime.Upfront)
      .notNull(),
    chargeValue: bigint('charge_value', { mode: 'bigint' }),
    moratoriumType: moratoriumTypeEnum('moratorium_type')
      .$type<MoratoriumType>()
      .default(MoratoriumType.None)
      .notNull(),
    moratoriumPeriod: integer('moratorium_period').default(0).notNull(),
    repaymentStartDate: timestamp('repayment_start_date', {
      withTimezone: true,
    }).notNull(),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    approvalNote: text('approval_note'),
    declineReason: text('decline_reason'),
    incomeGlAccountId: varchar('income_gl_account_id', { length: 36 })
      .notNull()
      .references(() => GeneralLedgers.id, { onDelete: 'restrict' }), // interest / profit income GL...
    feeIncomeGlAccountId: varchar('fee_income_gl_account_id', {
      length: 36,
    }).references(() => GeneralLedgers.id, { onDelete: 'restrict' }), // processing / admin fee GL...
    expenseGlAccountId: varchar('expense_gl_account_id', {
      length: 36,
    }).references(() => GeneralLedgers.id, { onDelete: 'restrict' }), // provisioning / write-off GL...
    charityGlAccountId: varchar('charity_gl_account_id', {
      length: 36,
    }).references(() => GeneralLedgers.id, { onDelete: 'restrict' }), // late fee donation destination for Sharia compliant account...
  },
  (table) => ({
    tenantIdx: index('idx_loan_details_tenant').on(table.tenantId),
  }),
);
