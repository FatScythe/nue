import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { users } from './user';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { Permission } from '@database/types';

const defaultPermission: Permission = {
  dashboard: { view: false },
  transaction: {
    view: false,
    add: false,
    generateStatement: false,
    generateReceipt: false,
    approve: false,
    reverse: false,
  },
  customer: {
    view: false,
    add: false,
    edit: false,
    deactivate: false,
    verifyKyc: false,
  },
  account: {
    view: false,
    create: false,
    freeze: false,
    close: false,
    updateLimits: false,
  },
  product: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  loan: {
    view: false,
    disburse: false,
    restructure: false,
    writeOff: false,
    approve: false,
  },
  ledger: {
    view: false,
    manualJournalEntry: false,
    reconcile: false,
    viewGlBalances: false,
  },
  developer: {
    view: false,
    manageApiKeys: false,
    viewWebhooks: false,
    simulateTransactions: false,
  },
  team: {
    view: false,
    add: false,
    activityLog: false,
    deactivate: false,
  },
};

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => businesses.id), // nullable for default roles...
  name: text('name').notNull(),
  permissions: jsonb('permissions')
    .$type<Permission>()
    .notNull()
    .default(defaultPermission),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id), // nullable for default, id of the user or api
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
