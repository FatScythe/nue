import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendWelcomeOrgNotificationDto {
  @IsEmail({}, { message: '[email_job]: Email address must be valid' })
  @IsNotEmpty({ message: '[email_job]: Email address is missing in job data' })
  emailAddress: string;

  @IsString()
  @IsNotEmpty({ message: '[email_job]: Company name is missing in job data' })
  name: string;
}
