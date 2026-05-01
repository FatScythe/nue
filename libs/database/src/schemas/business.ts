import {
  AnyPgColumn,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './user';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(), // tenant_id
  name: text('name').notNull(),
  emailAddress: text('email_address').unique().notNull(),
  reference: text('short_name').unique().notNull(),
  onboardedBy: uuid('created_by').references((): AnyPgColumn => users.id, {
    onDelete: 'set null',
  }), // sys admin user...
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
