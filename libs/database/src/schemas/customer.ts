import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './user';
import { businesses } from './business';
import { date } from 'drizzle-orm/pg-core';
import { varchar } from 'drizzle-orm/pg-core';
import {
  CustomerStatus,
  CustomerTier,
  CustomerType,
  CustomerGender,
} from '@database/enums';
import { CustomerLoopEntries } from '@database/types';

export const customerTypeEnum = pgEnum(
  'customer_type',
  Object.values(CustomerType) as [string, ...string[]],
);

export const customerStatusEnum = pgEnum(
  'customer_status',
  Object.values(CustomerStatus) as [string, ...string[]],
);

export const customerGenderEnum = pgEnum(
  'customer_gender',
  Object.values(CustomerGender) as [string, ...string[]],
);

export const customerTierEnum = pgEnum(
  'customer_tier',
  Object.values(CustomerTier) as [string, ...string[]],
);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'restrict' }),
  externalId: varchar('external_id', { length: 255 }).unique(),
  status: customerStatusEnum('status')
    .notNull()
    .default(CustomerStatus.PendingVerification),
  tier: customerTierEnum('tier').notNull().default(CustomerTier.TierZero),
  type: customerTypeEnum('type').notNull(),
  gender: customerGenderEnum('gender').default(CustomerGender.Nil).notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  middleName: text('middle_name'),
  dateOfBirth: date('date_of_birth', { mode: 'string' }),
  emailAddress: text('email_address').notNull(),
  businessName: text('business_name'),
  dateOfIncorporation: date('date_of_incorporation', { mode: 'string' }),
  phoneNumber: varchar('phone_number', { length: 40 }).notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  country: text('country').notNull(),
  documents: jsonb('documents')
    .$type<
      {
        type: string;
        url: string;
        uploadedAt: string;
      }[]
    >()
    .default([]),
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  metadata: jsonb('metadata')
    .$type<CustomerLoopEntries>()
    .default({})
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
