import {
  SendGeneralNotificationDto,
  SendLoginNotificationDto,
  SendWelcomeNotificationDto,
  SendWelcomeOrgNotificationDto,
} from '@background-process/dto';

export enum EmailWorkerJobEnum {
  SendLoginNotification = 'login_notification',
  SendGeneralNotification = 'general_notification',
  WelcomeEmailNotification = 'welcome_notification',
  InviteUserEmailNotification = 'invite_user_notification',
}

export type EmailJobPayloadMap = {
  [EmailWorkerJobEnum.SendLoginNotification]: SendLoginNotificationDto;
  [EmailWorkerJobEnum.SendGeneralNotification]: SendGeneralNotificationDto;
  [EmailWorkerJobEnum.WelcomeEmailNotification]: SendWelcomeOrgNotificationDto;
  [EmailWorkerJobEnum.InviteUserEmailNotification]: SendWelcomeNotificationDto;
};
