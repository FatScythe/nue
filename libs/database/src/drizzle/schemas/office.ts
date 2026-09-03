import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { businesses } from './business';

export const offices = pgTable(
  'offices',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: text('name').notNull(), // e.g., "Lagos Main Branch" or "Virtual Operations"
    code: text('code').notNull(), // e.g., "HQ-01"
    isHeadOffice: boolean('is_head_office').default(false),
    parentId: varchar('parent_id', { length: 36 }),
    dateOfIncorporation: date('date_of_incorporation', { mode: 'string' }),
    phoneNumber: text('phone_number').notNull(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // enforces that office code is unique per tenant (e.g. tenant a can't have two "hq-01" codes)...
    tenantCodeUniqueIdx: uniqueIndex('idx_offices_tenant_code_unique').on(
      table.tenantId,
      table.code,
    ),
    tenantIdx: index('idx_offices_tenant').on(table.tenantId),
  }),
);
