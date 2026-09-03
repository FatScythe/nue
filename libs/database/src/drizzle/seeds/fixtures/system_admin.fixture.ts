import { UserStatus, UserType } from '../../enums';

export const SYS_ADMIN_FIXTURE = {
  type: UserType.Human,
  status: UserStatus.Active,
  firstName: 'System',
  lastName: 'Administrator',
  emailAddress: 'sysadmin@nue.com',
  isOtpEnabled: false,
};
