// utils.ts
import { pgEnum } from 'drizzle-orm/pg-core';

import { Resources } from '@libs/database/drizzle/enums';
import { RolePermissions } from '@libs/database/drizzle/types';

export enum Currency {
  Ngn = 'ngn',
  Usd = 'usd',
}

export const dbCurrencyEnum = pgEnum(
  'currency_type',
  Object.values(Currency) as [string, ...string[]],
);

export const DEFAULT_PERMISSION = {
  [Resources.Customer]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Product]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Account]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Transaction]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Lien]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Loan]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
    disburse: false,
    repay: false,
    approve: false,
  },
  [Resources.Ledger]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Office]: {
    view: false,
    create: false,
    edit: false,
  },
  [Resources.Team]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Role]: {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
  },
  [Resources.Api]: {
    view: false,
    create: false,
    deactivate: false,
    edit: false,
  },
  [Resources.Configuration]: {
    view: false,
    create: false,
    deactivate: false,
    edit: false,
  },
} satisfies RolePermissions;
