import {
  AnyPgColumn,
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { roles } from './role';
import { UserStatus, UserType } from '@database/enums';

export const userTypeEnum = pgEnum(
  'user_type',
  Object.values(UserType) as [string, ...string[]],
);

export const userStatusEnum = pgEnum(
  'user_status',
  Object.values(UserStatus) as [string, ...string[]],
);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => businesses.id),
  type: userTypeEnum('type').notNull(),
  status: userTypeEnum('status').notNull(),
  emailAddress: text('email_address'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  otherName: text('other_name'),
  secretKey: text('secret_key').unique(),
  hashedPassword: text('hashed_password'),
  ipWhitelist: text('ip_address').array(),
  otpKey: text('otp_key'),
  isOtpEnabled: boolean('is_otp_enabled').default(false),
  roleId: uuid('role_id')
    .references(() => roles.id)
    .notNull(),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id), // nullable for default user, id of the user or api
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
