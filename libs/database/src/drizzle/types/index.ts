import { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';
import * as schema from '@database/drizzle/schemas';
import { Resources } from '@database/drizzle/enums';

export type DBTransaction = NodePgTransaction<typeof schema, any>;

export type DatabaseClient = NodePgDatabase<typeof schema> | DBTransaction;

export type RolePermissions = {
  [Resources.Customer]: {
    view: boolean;
    create: boolean;
  };
  [Resources.Account]: {
    view: boolean;
    create: boolean;
  };
  [Resources.Transaction]: {
    view: boolean;
    transfer: boolean;
    deposit: boolean;
  };
  [Resources.Lien]: {
    view: boolean;
    create: boolean;
    release: boolean;
  };
  [Resources.Loan]: {
    view: boolean;
    disburse: boolean;
    repay: boolean;
  };
  [Resources.Ledger]: {
    view: boolean;
    create: boolean;
  };
  [Resources.Office]: {
    view: boolean;
    create: boolean;
  };
};

type CRUDOps = 'create' | 'read' | 'update' | 'delete';

export const validScopes = [
  // office...
  `${Resources.Office}:read`,
  `${Resources.Office}:create`,

  // customer...
  `${Resources.Customer}:read`,
  `${Resources.Customer}:create`,
  `${Resources.Customer}:update`,

  // account...
  `${Resources.Account}:read`,
  `${Resources.Account}:create`,

  // transaction...
  `${Resources.Transaction}:read`,
  `${Resources.Transaction}:transfer`,
  `${Resources.Transaction}:deposit`,

  // lien...
  `${Resources.Lien}:read`,
  `${Resources.Lien}:create`,
  `${Resources.Lien}:release`,

  // loan...
  `${Resources.Loan}:read`,
  `${Resources.Loan}:disburse`,
  `${Resources.Loan}:repay`,

  // ledger...
  `${Resources.Ledger}:read`,
  `${Resources.Ledger}:create`,
] as const satisfies ReadonlyArray<`${Resources}:${string | CRUDOps}`>;

export type ApiScope = (typeof validScopes)[number];

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
