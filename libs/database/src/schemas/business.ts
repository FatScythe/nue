import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './user';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(), // tenant_id
  name: text('name').notNull(),
  email: text('email_address').unique().notNull(),
  reference: text('short_name').unique().notNull(),
  createdBy: uuid('created_by').references(() => users.id), // admin user...
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
