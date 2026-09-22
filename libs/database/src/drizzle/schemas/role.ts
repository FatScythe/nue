import {
  AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { RolePermissions } from '@database/drizzle/types';

import { Businesses } from './business';
import { Users } from './user';
import { DEFAULT_PERMISSION } from './utils';

export const Roles = pgTable(
  'roles',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()
    tenantId: integer('tenant_id').references(() => Businesses.id, {
      onDelete: 'restrict',
    }), // nullable for default system roles...
    name: text('name').notNull(),
    permissions: jsonb('permissions')
      .$type<RolePermissions>()
      .notNull()
      .default(DEFAULT_PERMISSION),
    createdBy: varchar('created_by', { length: 36 }).references(
      (): AnyPgColumn => Users.id,
      {
        onDelete: 'restrict',
      },
    ),
    approvedBy: varchar('approved_by', { length: 36 }).references(
      (): AnyPgColumn => Users.id,
      {
        onDelete: 'restrict',
      },
    ), // nullable for api user...
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // enforces unique role names per tenant...
    tenantRoleNameUniqueIdx: uniqueIndex('idx_roles_tenant_name_unique').on(
      table.tenantId,
      table.name,
    ),
    tenantIdx: index('idx_roles_tenant').on(table.tenantId),
  }),
);
