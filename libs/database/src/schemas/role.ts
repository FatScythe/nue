import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { users } from './user';

export enum Resources {
  Dashboard = 'dashboard',
  Team = 'team',
  Transaction = 'transaction',
  Developer = 'developer',
  Customer = 'customer',
  Account = 'account',
  Product = 'product',
  Loan = 'loan',
  Ledger = 'ledger',
  Audit = 'audit',
}

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

export type Permission = {
  [Resources.Dashboard]: {
    view: boolean;
  };
  [Resources.Transaction]: {
    view: boolean;
    add: boolean;
    generateStatement: boolean;
    generateReceipt: boolean;
    approve: boolean;
    reverse: boolean;
  };
  [Resources.Customer]: {
    view: boolean;
    add: boolean;
    edit: boolean;
    deactivate: boolean;
    verifyKyc: boolean;
  };
  [Resources.Account]: {
    view: boolean;
    create: boolean;
    freeze: boolean;
    close: boolean;
    updateLimits: boolean;
  };
  [Resources.Product]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Loan]: {
    view: boolean;
    disburse: boolean;
    restructure: boolean;
    writeOff: boolean;
    approve: boolean;
  };
  [Resources.Ledger]: {
    view: boolean;
    manualJournalEntry: boolean;
    reconcile: boolean;
    viewGlBalances: boolean;
  };
  [Resources.Developer]: {
    view: boolean;
    manageApiKeys: boolean;
    viewWebhooks: boolean;
    simulateTransactions: boolean;
  };
  [Resources.Team]: {
    view: boolean;
    add: boolean;
    activityLog: boolean;
    deactivate: boolean;
  };
};

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => businesses.id), // nullable for default roles...
  name: text('name').notNull(),
  permissions: jsonb('permissions')
    .$type<Permission>()
    .notNull()
    .default(defaultPermission),
  createdBy: uuid('created_by').references(() => users.id), // nullable for default, id of the user or api
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
