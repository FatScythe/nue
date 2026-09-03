import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  AnyPgColumn,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

import { GlCategory, GlNormalBalance } from '@database/drizzle/enums';

import { businesses } from './business';
import { users } from './user';

export const glCategoryEnum = pgEnum(
  'gl_category',
  Object.values(GlCategory) as [string, ...string[]],
);

export const normalBalanceEnum = pgEnum(
  'normal_balance',
  Object.values(GlNormalBalance) as [string, ...string[]],
);

export const generalLedgers = pgTable(
  'general_ledgers',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),

    code: text('code').notNull(), // e.g., "1010" for "Cash"
    name: text('name').notNull(),
    category: glCategoryEnum('category').notNull(),
    normalBalance: normalBalanceEnum('normal_balance').notNull(),

    // self-referencing FK for account hierarchy (e.g., Sub-GL -> Parent GL)
    parentId: varchar('parent_id', { length: 36 }).references(
      (): AnyPgColumn => generalLedgers.id,
      { onDelete: 'restrict' },
    ),

    allowDirectBooking: boolean('allow_direct_booking').default(true).notNull(),

    createdBy: varchar('created_by', { length: 36 }).references(
      () => users.id,
      { onDelete: 'restrict' },
    ), // id of the user or api...
    approvedBy: varchar('approved_by', { length: 36 }).references(
      () => users.id,
      { onDelete: 'restrict' },
    ), // id of the user or api...

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // enforces unique GL codes per tenant...
    tenantCodeUniqueIdx: uniqueIndex('idx_gl_tenant_code_unique').on(
      table.tenantId,
      table.code,
    ),
    tenantCategoryIdx: index('idx_gl_tenant_category').on(
      table.tenantId,
      table.category,
    ),
  }),
);
