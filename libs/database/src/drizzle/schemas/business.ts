import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  emailAddress: text('email_address').unique().notNull(),
  reference: text('short_name').unique().notNull(),
  onboardedBy: text('created_by').notNull(), // admin user name...
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
