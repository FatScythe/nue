import {
  pgTable,
  varchar,
  integer,
  text,
  numeric,
  boolean,
  bigint,
  timestamp,
  jsonb,
  index,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core';
import {
  AccountProductStatus,
  AccountProductType,
  AccountTenorUnit,
  ShariaContractType,
} from '../enums';
import { businesses } from './business';
import { Currency, dbCurrencyEnum } from './utils';
import { generalLedgers } from './general_ledger';

export const accountTypeEnum = pgEnum(
  'account_type',
  Object.values(AccountProductType) as [string, ...string[]],
);

export const shariaContractTypeEnum = pgEnum(
  'sharia_contract_type',
  Object.values(ShariaContractType) as [string, ...string[]],
);

export const productStatusEnum = pgEnum(
  'product_status',
  Object.values(AccountProductStatus) as [string, ...string[]],
);

export const tenorUnitEnum = pgEnum(
  'tenor_unit',
  Object.values(AccountTenorUnit) as [string, ...string[]],
);

export const accountProducts = pgTable(
  'account_products',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuidv7()...
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    type: accountTypeEnum('type').notNull(),
    status: productStatusEnum('status')
      .default(AccountProductStatus.Draft)
      .notNull(),

    isShariaCompliant: boolean('is_sharia_compliant').default(false).notNull(),
    shariaContractType: shariaContractTypeEnum('sharia_contract_type'),

    supportedCurrencies: dbCurrencyEnum('supported_currencies')
      .array()
      .notNull()
      .default([Currency.Ngn]),

    // deposit & balance contraints...
    minBalance: bigint('min_balance', { mode: 'bigint' }).default(0n).notNull(),
    minInitialDeposit: bigint('min_initial_deposit', { mode: 'bigint' })
      .default(0n)
      .notNull(),
    minAmount: bigint('min_amount', { mode: 'bigint' }),
    maxAmount: bigint('max_amount', { mode: 'bigint' }),

    // rates & ratios...
    defaultRate: numeric('default_rate', { precision: 5, scale: 2 })
      .default('0.00')
      .notNull(), // Conventional interest rate OR Murabaha profit margin
    customerProfitShareRatio: numeric('customer_profit_share_ratio', {
      precision: 5,
      scale: 2,
    }), // for mudarabah / musharakah deposit & financing
    bankProfitShareRatio: numeric('bank_profit_share_ratio', {
      precision: 5,
      scale: 2,
    }),

    // tenor config...
    minTenor: integer('min_tenor'),
    maxTenor: integer('max_tenor'),
    tenorUnit: tenorUnitEnum('tenor_unit').default('months'),

    // overdraft
    allowOverdraft: boolean('allow_overdraft').default(false).notNull(),
    overdraftLimit: bigint('overdraft_limit', { mode: 'bigint' })
      .default(0n)
      .notNull(),
    overdraftRate: numeric('overdraft_rate', { precision: 5, scale: 2 })
      .default('0.00')
      .notNull(),

    // fees & penalties...
    adminFee: bigint('admin_fee', { mode: 'bigint' }).default(0n).notNull(),
    lateFeeAmount: bigint('late_fee_amount', { mode: 'bigint' })
      .default(0n)
      .notNull(),
    earlyLiquidationPenaltyRate: numeric('early_liquidation_penalty_rate', {
      precision: 5,
      scale: 2,
    })
      .default('0.00')
      .notNull(),

    // General Ledger (GL) Accounting Mappings
    controlGlAccountId: varchar('control_gl_account_id', {
      length: 36,
    }).references(() => generalLedgers.id, { onDelete: 'restrict' }), // asset / liability GL
    incomeGlAccountId: varchar('income_gl_account_id', {
      length: 36,
    }).references(() => generalLedgers.id, { onDelete: 'restrict' }), // interest / profit income...
    expenseGlAccountId: varchar('expense_gl_account_id', {
      length: 36,
    }).references(() => generalLedgers.id, { onDelete: 'restrict' }), // interest / profit expense...
    feeIncomeGlAccountId: varchar('fee_income_gl_account_id', {
      length: 36,
    }).references(() => generalLedgers.id, { onDelete: 'restrict' }),
    charityGlAccountId: varchar('charity_gl_account_id', {
      length: 36,
    }).references(() => generalLedgers.id, { onDelete: 'restrict' }), // late fee donation destination for Sharia products...

    metadata: jsonb('metadata').default({}).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_account_products_tenant').on(table.tenantId),
    // tenantStatusIdx: index('idx_account_products_tenant_status').on(
    //   table.tenantId,
    //   table.status,
    // ),
    tenantCodeUnique: unique('uq_account_products_tenant_code').on(
      table.tenantId,
      table.code,
    ),
  }),
);
