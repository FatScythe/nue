import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { Resources, UserStatus, UserType } from '@database/drizzle/enums';
import { ApiScope } from '@database/drizzle/types';

import { businesses } from './business';
import { roles } from './role';
import { offices } from './office';

export const userTypeEnum = pgEnum(
  'user_type',
  Object.values(UserType) as [string, ...string[]],
);

export const userStatusEnum = pgEnum(
  'user_status',
  Object.values(UserStatus) as [string, ...string[]],
);

export const userApiScopeEnum = pgEnum(
  'user_api_scope',
  Object.values(Resources) as [string, ...string[]],
);

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    tenantId: varchar('tenant_id', { length: 36 }).references(
      () => businesses.id,
      {
        onDelete: 'restrict',
      },
    ), // nullable for sys admin...
    type: userTypeEnum('type').notNull(),
    status: userStatusEnum('status').notNull(),
    emailAddress: text('email_address'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    otherNames: text('other_names'),
    secretKey: text('secret_key').unique(),
    hashedPassword: text('hashed_password'),
    ipWhitelist: text('ip_address').array(),
    otpKey: text('otp_key'),
    isOtpEnabled: boolean('is_otp_enabled').default(false),
    roleId: varchar('role_id', { length: 36 }).references(() => roles.id, {
      onDelete: 'restrict',
    }),
    scopes: text('scopes').array().$type<ApiScope[]>(),
    officeId: integer('office_id').references(() => offices.id, {
      onDelete: 'restrict',
    }),
    createdBy: varchar('created_by', { length: 36 }).references(
      (): AnyPgColumn => users.id,
      {
        onDelete: 'restrict',
      },
    ), // nullable for default user, id of the user or api
    approvedBy: varchar('approved_by', { length: 36 }).references(
      (): AnyPgColumn => users.id,
      {
        onDelete: 'restrict',
      },
    ), // nullable for default user, id of the user or api
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // enforces unique email addresses per tenant...
    tenantEmailUniqueIdx: uniqueIndex('idx_users_tenant_email_unique').on(
      table.tenantId,
      table.emailAddress,
    ),
    tenantTypeIdx: index('idx_users_tenant_type').on(
      table.tenantId,
      table.type,
    ),
  }),
);
