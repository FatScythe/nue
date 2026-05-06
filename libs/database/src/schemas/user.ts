import {
  AnyPgColumn,
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { roles } from './role';
import { Resources, UserStatus, UserType } from '@database/enums';
import { offices } from './offices';

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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => businesses.id, {
    onDelete: 'restrict',
  }), // nullable for sys admin...
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
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'restrict' }),
  scopes: userApiScopeEnum('scopes').array(),
  officeId: integer('office_id').references(() => offices.id, {
    onDelete: 'restrict',
  }),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id, {
    onDelete: 'restrict',
  }), // nullable for default user, id of the user or api
  approvedBy: uuid('approved_by').references((): AnyPgColumn => users.id, {
    onDelete: 'restrict',
  }), // nullable for default user, id of the user or api
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
