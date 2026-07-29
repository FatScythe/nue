// utils.ts
import { Resources } from '@database/drizzle/enums';
import { RolePermissions } from '@database/drizzle/types';
import { pgEnum } from 'drizzle-orm/pg-core';

export enum Currency {
  Ngn = 'ngn',
  Usd = 'usd',
}

export const dbCurrencyEnum = pgEnum(
  'currency_type',
  Object.values(Currency) as [string, ...string[]],
);

export const DEFAULT_PERMISSION = {
  [Resources.Office]: {
    view: false,
    create: false,
  },
  [Resources.Customer]: {
    view: false,
    create: false,
  },
  [Resources.Account]: {
    view: false,
    create: false,
  },
  [Resources.Transaction]: {
    view: false,
    transfer: false,
    deposit: false,
  },
  [Resources.Lien]: {
    view: false,
    create: false,
    release: false,
  },
  [Resources.Loan]: {
    view: false,
    disburse: false,
    repay: false,
  },
  [Resources.Ledger]: {
    view: false,
    create: false,
  },
} satisfies RolePermissions;
