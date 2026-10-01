import {
  DEFAULT_BUSINESS_CUSTOMER_ID,
  DEFAULT_FEMALE_CUSTOMER_ID,
  DEFAULT_MALE_CUSTOMER_ID,
} from '@database/drizzle/database.constant';
import {
  CustomerGender,
  CustomerStatus,
  CustomerTier,
  CustomerType,
} from '@database/drizzle/enums';
import { Customers } from '@database/drizzle/schemas';

export const CUSTOMERS_FIXTURE: Omit<
  typeof Customers.$inferInsert,
  'officeId' | 'tenantId'
>[] = [
  {
    id: DEFAULT_MALE_CUSTOMER_ID,
    firstName: 'ZAID',
    lastName: 'ARDYN',
    middleName: 'KOLAWOLE',
    emailAddress: 'zaidryn@mail.com',
    street: 'ilyas street off masjid haram corner',
    city: 'makkah',
    state: 'jeddah',
    country: 'saudi-arabia',
    phoneNumber: '238-909-56',
    type: CustomerType.Individual,
    tier: CustomerTier.TierOne,
    dateOfBirth: new Date('1890-01-04').toISOString(),
    gender: CustomerGender.Male,
    status: CustomerStatus.Active,
  },
  {
    id: DEFAULT_FEMALE_CUSTOMER_ID,
    firstName: 'ASIYA',
    lastName: 'MARYAM',
    middleName: 'AISHA',
    emailAddress: 'marsiyam@mail.com',
    street: 'firaun street off pyramid avenue',
    city: 'cairo',
    state: 'alexandra',
    country: 'egypt',
    phoneNumber: '938-909-564',
    type: CustomerType.Individual,
    tier: CustomerTier.TierTwo,
    dateOfBirth: new Date('1999-01-04').toISOString(),
    gender: CustomerGender.Female,
    status: CustomerStatus.Active,
  },
  {
    id: DEFAULT_BUSINESS_CUSTOMER_ID,
    businessName: 'NUE',
    emailAddress: 'nue-technologies@mail.com',
    street: 'firaun street off pyramid avenue',
    city: 'ikeja',
    state: 'lagos',
    country: 'nigeria',
    phoneNumber: '+234-738-909-5648',
    type: CustomerType.Corporate,
    tier: CustomerTier.TierThree,
    dateOfIncorporation: new Date('2017-01-04').toISOString(),
    gender: CustomerGender.Nil,
    status: CustomerStatus.Active,
  },
];
