import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  bigint,
  varchar,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { accounts, businesses, users } from '.';
import { LienStatus } from '@database/drizzle/enums';

export const lienStatusEnum = pgEnum(
  'lien_status',
  Object.values(LienStatus) as [string, ...string[]],
);

export const liens = pgTable(
  'liens',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    accountId: varchar('account_id', { length: 36 })
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    tenantId: varchar('tenant_id', { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),

    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    reason: text('reason'),
    reference: text('reference'), // Handled via tenant unique index
    status: lienStatusEnum('status').default(LienStatus.Active).notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }), // optional hold release date...

    createdBy: varchar('created_by', { length: 36 })
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // enforces unique reference per tenant...
    tenantReferenceUniqueIdx: uniqueIndex(
      'idx_liens_tenant_reference_unique',
    ).on(table.tenantId, table.reference),
    tenantAccountIdx: index('idx_liens_tenant_account').on(
      table.tenantId,
      table.accountId,
    ),
    tenantStatusIdx: index('idx_liens_tenant_status').on(
      table.tenantId,
      table.status,
    ),
  }),
);
