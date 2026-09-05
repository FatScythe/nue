import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendWelcomeNotificationDto {
  @IsEmail({}, { message: '[email_job]: Email address must be valid' })
  @IsNotEmpty({ message: '[email_job]: Email address is missing in job data' })
  emailAddress: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  invitedBy: string;

  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsString()
  @IsNotEmpty({ message: '[email_job]: Set up link is missing in job data' })
  setupLink: string;

  @IsString()
  @IsNotEmpty()
  validityTime: string;
}
