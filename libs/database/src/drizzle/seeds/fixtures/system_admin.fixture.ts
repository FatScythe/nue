import { users } from '@database/drizzle/schemas';
import { UserStatus, UserType } from '../../enums';

export const SYS_ADMIN_FIXTURE: Partial<typeof users.$inferInsert> = {
  type: UserType.Human,
  status: UserStatus.Active,
  firstName: 'System',
  lastName: 'Administrator',
  emailAddress: 'sysadmin@nue.com',
  isOtpEnabled: false,
};
