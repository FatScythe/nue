import { Businesses } from '@database/drizzle/schemas';

export const CORE_BUSINESS_FIXTURE: typeof Businesses.$inferInsert = {
  name: 'Nue Core Banking Ltd',
  emailAddress: 'operations@nuecore.com',
  reference: 'NUE-CORE',
  onboardedBy: 'SYS ADMIN',
};
