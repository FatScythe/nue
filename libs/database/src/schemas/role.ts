import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { users } from './user';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { Permission } from '@database/types';
import { Resources } from '@database/enums';

const defaultPermission = {
  [Resources.Dashboard]: {
    view: false,
  },
  [Resources.Security]: {
    resetStaffPassword: false,
    unlockStaffAccount: false,
    manageRoles: false,
    forceLogout: false,
  },
  [Resources.Configuration]: {
    view: false,
    updateConfigurations: false,
    updateInterestRates: false,
    updateFees: false,
    updateKycLimits: false,
    toggleMaintenanceMode: false,
    authorize: false,
  },
  [Resources.Audit]: {
    view: false,
    exportLogs: false,
    authorize: false,
  },
  [Resources.Transaction]: {
    view: false,
    add: false,
    generateStatement: false,
    generateReceipt: false,
    approve: false,
    reverse: false,
    authorize: false,
  },
  [Resources.Customer]: {
    view: false,
    add: false,
    edit: false,
    downloadDocuments: false,
    deactivate: false,
    verifyKyc: false,
    authorize: false,
  },
  [Resources.Account]: {
    view: false,
    viewBalance: false,
    create: false,
    freeze: false,
    close: false,
    updateLimits: false,
    authorize: false,
  },
  [Resources.Lien]: {
    view: false,
    add: false,
    release: false,
    void: false,
    edit: false,
    authorize: false,
  },
  [Resources.Product]: {
    view: false,
    add: false,
    edit: false,
    deactivate: false,
    authorize: false,
  },
  [Resources.Loan]: {
    view: false,
    add: false,
    edit: false,
    disburse: false,
    writeOff: false,
    authorize: false,
  },
  [Resources.Ledger]: {
    view: false,
    manualJournalEntry: false,
    reconcile: false,
    viewGlBalances: false,
    authorize: false,
  },
  [Resources.Developer]: {
    view: false,
    manageApiKeys: false,
    whitelistIp: false,
    viewWebhooks: false,
    simulateTransactions: false,
    authorize: false,
  },
  [Resources.Team]: {
    view: false,
    add: false,
    activityLog: false,
    deactivate: false,
    authorize: false,
  },
} satisfies Permission;

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => businesses.id, {
    onDelete: 'restrict',
  }), // nullable for default roles...
  name: text('name').notNull(),
  permissions: jsonb('permissions')
    .$type<Permission>()
    .notNull()
    .default(defaultPermission),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id, {
    onDelete: 'restrict',
  }),
  approvedBy: uuid('approved_by').references((): AnyPgColumn => users.id, {
    onDelete: 'restrict',
  }), // nullable for api user...
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
