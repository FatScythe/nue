import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { generalLedger } from './general_ledger';
import { SavingsPoolStatus } from '@database/enums';
import { users } from './user';
import { offices } from './offices';

export const poolStatusEnum = pgEnum(
  'savings_pool_status',
  Object.values(SavingsPoolStatus) as [string, ...string[]],
);

export const savingsPools = pgTable('savings_pools', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => businesses.id, { onDelete: 'restrict' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  glAccountId: uuid('gl_account_id')
    .references(() => generalLedger.id, { onDelete: 'restrict' })
    .notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 }).default(
    '0.00',
  ),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }),
  officeId: integer('office_id').references(() => offices.id, {
    onDelete: 'restrict',
  }),
  status: poolStatusEnum('status').default(SavingsPoolStatus.Active),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
