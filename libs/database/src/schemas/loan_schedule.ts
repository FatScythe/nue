import {
  pgTable,
  uuid,
  bigint,
  integer,
  timestamp,
  pgEnum,
  decimal,
} from 'drizzle-orm/pg-core';
import { accounts } from './account'; // Your main accounts table

export enum LoanScheduleStatus {
  Scheduled = 'scheduled', // future payment...
  Pending = 'pending', // due today or very soon
  Paid = 'paid', // fully paid
  PartiallyPaid = 'partially_paid', // paid some, but not all
  Overdue = 'overdue', // past due date
  Waived = 'waived', // mgmt cancelled this specific installment
}

export const loanScheduleStatusEnum = pgEnum(
  'loan_schedule_status',
  Object.values(LoanScheduleStatus) as [string, ...string[]],
);

export const loanSchedules = pgTable('loan_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  accountId: uuid('account_id')
    .references(() => accounts.id)
    .notNull(),
  installmentNumber: integer('installment_number').notNull(), // e.g., 1 of 12
  dueDate: timestamp('due_date').notNull(),
  principalAmount: bigint('principal_amount', { mode: 'bigint' }).notNull(),
  interestAmount: bigint('interest_amount', { mode: 'bigint' }).notNull(),
  totalInstallment: bigint('total_installment', { mode: 'bigint' }).notNull(),
  principalPaid: bigint('principal_paid', { mode: 'bigint' })
    .default(0n)
    .notNull(),
  interestPaid: bigint('interest_paid', { mode: 'bigint' })
    .default(0n)
    .notNull(),
  totalPaid: bigint('total_paid', { mode: 'bigint' }).default(0n).notNull(),
  penaltyAccrued: bigint('penalty_accrued', { mode: 'bigint' })
    .default(0n)
    .notNull(),
  status: loanScheduleStatusEnum('status').default('scheduled').notNull(),
  lastPaymentDate: timestamp('last_payment_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
