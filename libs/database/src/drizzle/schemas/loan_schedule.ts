import {
  pgTable,
  bigint,
  integer,
  timestamp,
  pgEnum,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { accounts } from './account';
import { LoanScheduleStatus } from '@database/drizzle/enums';
import { businesses } from './business';
import { users } from './user';
import { sql } from 'drizzle-orm';

export const loanScheduleStatusEnum = pgEnum(
  'loan_schedule_status',
  Object.values(LoanScheduleStatus) as [string, ...string[]],
);

export const loanSchedules = pgTable(
  'loan_schedules',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    accountId: varchar('account_id', { length: 36 })
      .references(() => accounts.id, { onDelete: 'restrict' })
      .notNull(),
    tenantId: varchar('tenant_id', { length: 36 })
      .references(() => businesses.id, { onDelete: 'restrict' })
      .notNull(),
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
    paidAt: timestamp('paid_at', { withTimezone: true }),
    lastPaymentDate: timestamp('last_payment_date', { withTimezone: true }),
    comment: text('comment'),
    createdBy: varchar('created_by', { length: 36 }).references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // (table) => ({
  //   accountDueDateIdx: index('idx_loan_schedules_account_due').on(
  //     table.accountId,
  //     table.dueDate,
  //   ),
  //   statusIdx: index('idx_loan_schedules_status').on(table.status),
  //   tenantAccountIdx: index('idx_loan_schedules_tenant_account').on(
  //     table.tenantId,
  //     table.accountId,
  //   ),
  // }),
);
