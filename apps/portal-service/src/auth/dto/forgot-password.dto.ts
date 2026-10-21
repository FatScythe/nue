import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail(undefined, { message: 'Please provide valid email address' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsString()
  @Length(4, 255)
  emailAddress: string;
}
