import { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';

import { Resources } from '@libs/database/drizzle/enums';
import * as schema from '@libs/database/drizzle/schemas';

export type DBTransaction = NodePgTransaction<typeof schema, any>;

export type DatabaseClient = NodePgDatabase<typeof schema> | DBTransaction;

export type RolePermissions = {
  [Resources.Customer]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Product]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Account]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Transaction]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Lien]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Loan]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
    disburse: boolean;
    repay: boolean;
    approve: boolean;
  };
  [Resources.Ledger]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Office]: {
    view: boolean;
    create: boolean;
    edit: boolean;
  };
  [Resources.Team]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    deactivate: boolean;
  };
  [Resources.Api]: {
    view: boolean;
    create: boolean;
    deactivate: boolean;
    edit: boolean;
  };
  [Resources.Configuration]: {
    view: boolean;
    create: boolean;
    deactivate: boolean;
    edit: boolean;
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

  // product...
  `${Resources.Product}:read`,
  `${Resources.Product}:create`,
  `${Resources.Product}:update`,
  `${Resources.Product}:deactivate`,

  // account...
  `${Resources.Account}:read`,
  `${Resources.Account}:create`,
  `${Resources.Account}:update`,

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
  `${Resources.Loan}:update`,
  `${Resources.Loan}:approve`,
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
