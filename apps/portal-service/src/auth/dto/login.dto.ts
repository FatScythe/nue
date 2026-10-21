import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail(undefined, { message: 'Please provide valid email address' })
  @Length(4, 255)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  emailAddress: string;

  @IsOptional()
  @MaxLength(100)
  @IsStrongPassword(
    { minLength: 8 },
    { message: 'Please provide valid password' },
  )
  password?: string;

  @IsOptional()
  @IsNumberString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'One Time Password should be a 6 six digit number' })
  otp?: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean = false;
}
