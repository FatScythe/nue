import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class GeneralNotificationDataDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty({
    message: '[email_job]: Email template not attached to payload',
  })
  body: string;
}

export class SendGeneralNotificationDto {
  @IsEmail({}, { message: '[email_job]: Email address must be valid' })
  @IsNotEmpty({ message: '[email_job]: Email not attached to payload' })
  emailAddress: string;

  @IsString()
  @IsNotEmpty({ message: '[email_job]: Email subject not attached to payload' })
  subject: string;

  @ValidateNested()
  @Type(() => GeneralNotificationDataDto)
  data: GeneralNotificationDataDto;
}
