import { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';
import * as schema from '@database/schemas';
import { Resources } from '@database/enums';

export type DBTransaction = NodePgTransaction<typeof schema, any>;

export type DatabaseClient = NodePgDatabase<typeof schema> | DBTransaction;

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
