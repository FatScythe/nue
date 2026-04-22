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
import { CustomerStatus, CustomerTier, CustomerType } from '@database/enums';
import { CustomerLoopEntries } from '@database/types';

const customerTypeEnum = pgEnum(
  'customer_type',
  Object.values(CustomerType) as [string, ...string[]],
);

const customerStatusEnum = pgEnum(
  'customer_status',
  Object.values(CustomerStatus) as [string, ...string[]],
);

const customerTierEnum = pgEnum(
  'customer_tier',
  Object.values(CustomerTier) as [string, ...string[]],
);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => businesses.id),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  status: customerStatusEnum('status')
    .notNull()
    .default(CustomerStatus.PendingVerification),
  tier: customerTierEnum('tier').notNull().default(CustomerTier.TierZero),
  type: customerTypeEnum('type').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  emailAddress: text('email_address').notNull(),
  businessName: text('business_name'),
  dateOfBirth: date('date_of_birth'), // or dateOfIncorporation
  phoneNumber: varchar('phone_number', { length: 40 }).notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
