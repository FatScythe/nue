import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendLoginNotificationDto {
  @IsEmail({}, { message: '[email_job]: Email address must be valid' })
  @IsNotEmpty({ message: '[email_job]: Email not attached to payload' })
  emailAddress: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsIn(['login', 'failed_login'])
  type?: 'login' | 'failed_login';
}
