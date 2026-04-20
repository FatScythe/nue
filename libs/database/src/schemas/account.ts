import {
  bigint,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { businesses } from './business';
import { customers } from './customer';
import { accountProducts } from './account_product';
import { Currency, dbCurrencyEnum } from './utils';
import { users } from './user';

export enum AccountStatus {
  Pending = 'pending', // account created but requires initial funding or final back-office approval
  Active = 'active', // fully operational: can send and receive funds
  Suspended = 'suspended', // temporarily restricted: usually for internal review or minor compliance issues
  Frozen = 'frozen', // legally/hard blocked: zero movement allowed (liens, court orders, or AML red flags)
  // Post No Credit: Account can send money OUT, but cannot receive money IN
  // used for accounts being cleared out or restricted from receiving new deposits
  PendingNoCredit = 'pnc',
  // Post No Debit: account can receive money IN, but cannot send money OUT
  // the most common restriction for expired IDs or unverified KYCs
  PendingNoDebit = 'pnd',
  Closed = 'closed', // relationship terminated: account is inactive and cannot be reused
  Rejected = 'rejected', // onboarding failed: application was turned down during the pending stage
}

const accountStatusEnum = pgEnum(
  'account_status',
  Object.values(AccountStatus) as [string, ...string[]],
);

interface AccountLoopEntries {
  Nuban?: string;
}

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id),
  tenantId: uuid('tenant_id').references(() => businesses.id),
  productId: uuid('product_id').references(() => accountProducts.id),
  status: accountStatusEnum('status').notNull().default(AccountStatus.Pending),
  accountNumber: text('account_number').unique().notNull(),
  currency: dbCurrencyEnum('currency').notNull().default(Currency.Ngn),
  balance: bigint('balance', { mode: 'bigint' }).default(0n),
  bookBalance: bigint('book_balance', { mode: 'bigint' }).default(0n), // balance including pending transactions
  createdBy: uuid('created_by').references(() => users.id), // id of the user or api
  metadata: jsonb('metadata').$type<AccountLoopEntries>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
