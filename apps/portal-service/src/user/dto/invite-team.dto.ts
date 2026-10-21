import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  @Length(4, 255)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 255)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 255)
  lastName: string;

  @IsOptional()
  @IsString()
  @Length(4, 255)
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID(7)
  roleId: string;
}
