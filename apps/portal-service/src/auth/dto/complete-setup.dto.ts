import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

export class CompleteSetupDto {
  @IsString()
  @IsOptional()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special symbol.',
    },
  )
  password: string; // Optional if they already have a password and only need OTP reset...

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  otp: string; // 6-digit TOTP token from authenticator app...
}
