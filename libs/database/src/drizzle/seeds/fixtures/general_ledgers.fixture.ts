import { GeneralLedgers } from '@database/drizzle/schemas';

import { GlCategory, GlNormalBalance } from '../../enums';

export const LEDGERS_FIXTURE: Partial<typeof GeneralLedgers.$inferInsert>[] = [
  {
    allowDirectBooking: true,
    normalBalance: GlNormalBalance.Debit,
    category: GlCategory.Asset,
    code: '1000-01',
    name: 'Main Cash Vault',
  },
  {
    allowDirectBooking: false,
    normalBalance: GlNormalBalance.Credit,
    category: GlCategory.Liability,
    code: '2000-01',
    name: 'Customer Savings Control Account',
  },
  {
    code: '1010',
    name: 'Customer Deposit Liability',
    category: GlCategory.Liability,
    normalBalance: GlNormalBalance.Credit,
    allowDirectBooking: false,
  },
  {
    allowDirectBooking: true,
    normalBalance: GlNormalBalance.Credit,
    category: GlCategory.Liability,
    code: '3310',
    name: 'Customer Deposit Fee',
  },
  {
    allowDirectBooking: true,
    normalBalance: GlNormalBalance.Debit,
    category: GlCategory.Asset,
    code: '2000',
    name: 'Loans Portfolio Control',
  },
  {
    allowDirectBooking: false,
    normalBalance: GlNormalBalance.Credit,
    category: GlCategory.Income,
    code: '1750',
    name: 'Loan Interest Income',
  },
  {
    allowDirectBooking: false,
    normalBalance: GlNormalBalance.Credit,
    category: GlCategory.Income,
    code: '1950',
    name: 'Loan Fee Income',
  },
];
