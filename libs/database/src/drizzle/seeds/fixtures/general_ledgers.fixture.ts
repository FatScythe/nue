import { GlCategory, GlNormalBalance } from '../../enums';

export const LEDGERS_FIXTURE = [
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
];
