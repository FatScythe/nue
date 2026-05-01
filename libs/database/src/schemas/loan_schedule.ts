import {
  pgTable,
  uuid,
  bigint,
  integer,
  timestamp,
  pgEnum,
  text,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';
import { LoanScheduleStatus } from '@database/enums';
import { businesses } from './business';
import { users } from './user';
import { sql } from 'drizzle-orm';

export const loanScheduleStatusEnum = pgEnum(
  'loan_schedule_status',
  Object.values(LoanScheduleStatus) as [string, ...string[]],
);

export const loanSchedules = pgTable('loan_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'restrict' })
    .notNull(),
  tenantId: uuid('tenant_id').references(() => businesses.id, {
    onDelete: 'restrict',
  }),
  installmentNumber: integer('installment_number').notNull(), // e.g., 1 of 12
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  principalAmount: bigint('principal_amount', { mode: 'bigint' }).notNull(),
  interestAmount: bigint('interest_amount', { mode: 'bigint' }).notNull(),
  totalInstallment: bigint('total_installment', { mode: 'bigint' }).notNull(),
  principalPaid: bigint('principal_paid', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  interestPaid: bigint('interest_paid', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  totalPaid: bigint('total_paid', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  penaltyAccrued: bigint('penalty_accrued', { mode: 'bigint' })
    .default(sql`0`)
    .notNull(),
  status: loanScheduleStatusEnum('status')
    .default(LoanScheduleStatus.Scheduled)
    .notNull(),
  lastPaymentDate: timestamp('last_payment_date', { withTimezone: true }),
  comment: text('comment'),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }),
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
