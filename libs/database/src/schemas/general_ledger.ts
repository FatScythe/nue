import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { users } from './user';

export const generalLedger = pgTable('general_ledgers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'restrict' }),
  code: text('code').notNull(), // e.g., "1010" for "Cash"
  name: text('name').notNull(),
  category: text('category').notNull(), // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  approvedBy: uuid('approved_by').references(() => users.id, {
    onDelete: 'restrict',
  }), // id of the user or api
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
