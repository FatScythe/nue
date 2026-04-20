// utils.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export enum Currency {
  Ngn = 'ngn',
  Usd = 'usd',
}

export const dbCurrencyEnum = pgEnum(
  'currency_type',
  Object.values(Currency) as [string, ...string[]],
);
