import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { sql } from 'drizzle-orm';

export enum UserType {
  Human = 'human',
  Api = 'api',
}

export const userTypeEnum = pgEnum(
  'user_type',
  Object.values(UserType) as [string, ...string[]],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => businesses.id),
    type: userTypeEnum('type').notNull(),
    emailAddress: text('email_address'),
    secretKey: text('secret_key'),
    ipWhitelist: text('ip_address').array(),
    otpKey: text('otp_key'),
    isOtpEnabled: boolean('is_otp_enabled').default(false),
    createdBy: uuid('created_by').references(() => users.id), // nullable for default user, id of the user or api
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      emailRequiredForHumans: check(
        'email_required_check',
        sql`CASE WHEN ${table.type} = '${sql.raw(UserType.Human)}' THEN ${table.emailAddress} IS NOT NULL ELSE TRUE END`,
      ),
      tenantEmailUnique: uniqueIndex('tenant_email_unique')
        .on(table.tenantId, table.emailAddress)
        .where(sql`${table.emailAddress} is not null`),
    };
  },
);
