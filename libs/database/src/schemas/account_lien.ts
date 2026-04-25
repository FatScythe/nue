import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  bigint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts, businesses, users } from './';
import { LienStatus } from '@database/enums';

const lienStatusEnum = pgEnum(
  'lien_status',
  Object.values(LienStatus) as [string, ...string[]],
);

export const accountLiens = pgTable('account_liens', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  reason: text('reason'),
  reference: text('reference').unique(),
  status: lienStatusEnum('status').notNull().default(LienStatus.Active),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
