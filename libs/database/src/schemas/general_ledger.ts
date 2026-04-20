import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { users } from './user';

export const generalLedger = pgTable('general_ledger', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => businesses.id),
  code: text('code').notNull(), // e.g., "1010" for "Cash"
  name: text('name').notNull(),
  category: text('category').notNull(), // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
