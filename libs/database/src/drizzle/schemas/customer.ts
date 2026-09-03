import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

import {
  CustomerStatus,
  CustomerTier,
  CustomerType,
  CustomerGender,
} from '@database/drizzle/enums';
import { CustomerLoopEntries } from '@database/drizzle/types';

import { businesses } from './business';
import { users } from './user';
import { offices } from './office';

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

export const customers = pgTable(
  'customers',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    officeId: integer('office_id')
      .references(() => offices.id, { onDelete: 'restrict' })
      .notNull(),
    externalId: varchar('external_id', { length: 255 }), // Handled via tenant-scoped unique index
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
    createdBy: varchar('created_by', { length: 36 }).references(
      () => users.id,
      { onDelete: 'restrict' },
    ), // id of the user or api
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
  },
  (table) => ({
    // enforces uniqueness within the tenant scope...
    tenantExternalIdUniqueIdx: uniqueIndex(
      'idx_customers_tenant_external_id_unique',
    ).on(table.tenantId, table.externalId),
    tenantEmailUniqueIdx: uniqueIndex('idx_customers_tenant_email_unique').on(
      table.tenantId,
      table.emailAddress,
    ),
    tenantOfficeIdx: index('idx_customers_tenant_office').on(
      table.tenantId,
      table.officeId,
    ),
    tenantStatusIdx: index('idx_customers_tenant_status').on(
      table.tenantId,
      table.status,
    ),
  }),
);
