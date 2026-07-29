import {
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  AnyPgColumn,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

import { RolePermissions } from '@database/drizzle/types';

import { users } from './user';
import { businesses } from './business';
import { DEFAULT_PERMISSION } from './utils';

export const roles = pgTable(
  'roles',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()
    tenantId: varchar('tenant_id', { length: 36 }).references(
      () => businesses.id,
      {
        onDelete: 'restrict',
      },
    ), // nullable for default system roles...
    name: text('name').notNull(),
    permissions: jsonb('permissions')
      .$type<RolePermissions>()
      .notNull()
      .default(DEFAULT_PERMISSION),
    createdBy: varchar('created_by', { length: 36 }).references(
      (): AnyPgColumn => users.id,
      {
        onDelete: 'restrict',
      },
    ),
    approvedBy: varchar('approved_by', { length: 36 }).references(
      (): AnyPgColumn => users.id,
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
