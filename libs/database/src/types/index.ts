import { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';
import * as schema from '@database/schemas';
import { Resources } from '@database/enums';

export type DBTransaction = NodePgTransaction<typeof schema, any>;

export type DatabaseClient = NodePgDatabase<typeof schema> | DBTransaction;

export type Permission = {
  [Resources.Dashboard]: {
    view: boolean;
  };
  [Resources.Security]: {
    resetStaffPassword: boolean;
    unlockStaffAccount: boolean;
    manageRoles: boolean;
    forceLogout: boolean;
  };
  [Resources.Configuration]: {
    view: boolean;
    updateConfigurations: boolean;
    updateInterestRates: boolean;
    updateFees: boolean;
    updateKycLimits: boolean;
    toggleMaintenanceMode: boolean;
    authorize: boolean;
  };
  [Resources.Audit]: {
    view: boolean;
    exportLogs: boolean;
    authorize: boolean;
  };
  [Resources.Transaction]: {
    view: boolean;
    add: boolean;
    generateStatement: boolean;
    generateReceipt: boolean;
    approve: boolean;
    reverse: boolean;
    authorize: boolean;
  };
  [Resources.Customer]: {
    view: boolean;
    add: boolean;
    edit: boolean;
    downloadDocuments: boolean;
    deactivate: boolean;
    verifyKyc: boolean;
    authorize: boolean;
  };
  [Resources.Account]: {
    view: boolean;
    viewBalance: boolean;
    create: boolean;
    freeze: boolean;
    close: boolean;
    updateLimits: boolean;
    authorize: boolean;
  };
  [Resources.Lien]: {
    view: boolean;
    add: boolean;
    release: boolean;
    void: boolean;
    edit: boolean;
    authorize: boolean;
  };
  [Resources.Product]: {
    view: boolean;
    add: boolean;
    edit: boolean;
    deactivate: boolean;
    authorize: boolean;
  };
  [Resources.Loan]: {
    view: boolean;
    add: boolean;
    edit: boolean;
    disburse: boolean;
    writeOff: boolean;
    authorize: boolean;
  };
  [Resources.Ledger]: {
    view: boolean;
    manualJournalEntry: boolean;
    reconcile: boolean;
    viewGlBalances: boolean;
    authorize: boolean;
  };
  [Resources.Developer]: {
    view: boolean;
    manageApiKeys: boolean;
    whitelistIp: boolean;
    viewWebhooks: boolean;
    simulateTransactions: boolean;
    authorize: boolean;
  };
  [Resources.Team]: {
    view: boolean;
    add: boolean;
    activityLog: boolean;
    deactivate: boolean;
    authorize: boolean;
  };
};

export interface CustomerLoopEntries {
  bvn?: string;
  nin?: string;
  tin?: string;
  nextOfKin?: string;
  rcNumber?: string;
  title?: string;
}

export interface AccountLoopEntries {
  nuban?: string;
}
