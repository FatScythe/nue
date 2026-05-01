import {
  boolean,
  date,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';

export const offices = pgTable('offices', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => businesses.id)
    .notNull(),
  name: text('name').notNull(), // e.g., "Lagos Main Branch" or "Virtual Operations"
  code: text('code').notNull(), // e.g., "HQ-01"
  isHeadOffice: boolean('is_head_office').default(false),
  dateOfIncorporation: date('date_of_incorporation', { mode: 'string' }),
  phoneNumber: text('phone_number').notNull(),
  address: text('street').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
