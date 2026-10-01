import {
  DEFAULT_BUSINESS_ACCOUNT_ID,
  DEFAULT_BUSINESS_CUSTOMER_ID,
  DEFAULT_FEMALE_ACCOUNT_ID,
  DEFAULT_FEMALE_CUSTOMER_ID,
  DEFAULT_MALE_ACCOUNT_ID,
  DEFAULT_MALE_CUSTOMER_ID,
} from '@database/drizzle/database.constant';
import { AccountStatus, AccountType } from '@database/drizzle/enums';
import { Accounts, Currency } from '@database/drizzle/schemas';

import { CUSTOMERS_FIXTURE } from './customers.fixture';

const maleCustomer = CUSTOMERS_FIXTURE.find(
  (i) => i.id === DEFAULT_MALE_CUSTOMER_ID,
);

const femaleCustomer = CUSTOMERS_FIXTURE.find(
  (i) => i.id === DEFAULT_FEMALE_CUSTOMER_ID,
);

const businessCustomer = CUSTOMERS_FIXTURE.find(
  (i) => i.id === DEFAULT_BUSINESS_CUSTOMER_ID,
);

if (!maleCustomer || !femaleCustomer || !businessCustomer) {
  throw new Error('Invalid customer fixtures for accounts seeding');
}

export const ACCOUNTS_FIXTURE: Omit<
  typeof Accounts.$inferInsert,
  'officeId' | 'tenantId' | 'controlGlAccountId'
>[] = [
  {
    id: DEFAULT_MALE_ACCOUNT_ID,
    accountName: [
      maleCustomer.firstName,
      maleCustomer.middleName,
      maleCustomer.lastName,
    ]
      .filter(Boolean)
      .join(' '),
    accountNumber: 'X000000001',
    activationDate: new Date(),
    balance: BigInt(0),
    bookBalance: BigInt(0),
    currency: Currency.Ngn,
    status: AccountStatus.Active,
    customerId: maleCustomer.id,
    type: AccountType.Savings,
  },
  {
    id: DEFAULT_FEMALE_ACCOUNT_ID,
    accountName: [
      femaleCustomer.firstName,
      femaleCustomer.middleName,
      femaleCustomer.lastName,
    ]
      .filter(Boolean)
      .join(' '),
    accountNumber: 'X000000002',
    activationDate: new Date(),
    balance: BigInt(0),
    bookBalance: BigInt(0),
    currency: Currency.Ngn,
    status: AccountStatus.Active,
    customerId: femaleCustomer.id,
    type: AccountType.Savings,
  },
  {
    id: DEFAULT_BUSINESS_ACCOUNT_ID,
    accountName: businessCustomer.businessName || 'NUE Technologies',
    accountNumber: 'X000000003',
    activationDate: new Date(),
    balance: BigInt(0),
    bookBalance: BigInt(0),
    currency: Currency.Ngn,
    status: AccountStatus.Active,
    customerId: businessCustomer.id,
    type: AccountType.Savings,
  },
];
