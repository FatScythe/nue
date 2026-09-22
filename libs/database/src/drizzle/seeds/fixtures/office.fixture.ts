import { Offices } from '@database/drizzle/schemas';

export const HEAD_OFFICE_FIXTURE: Partial<typeof Offices.$inferInsert> = {
  name: 'Head Office',
  code: 'MB-01',
  dateOfIncorporation: '2002-11-12',
  isHeadOffice: true,
  phoneNumber: '090XXXXXXXX',
  addressLine1: 'X, Eren Jaeger Rd, Agege, Lagos, Nigeria',
};
