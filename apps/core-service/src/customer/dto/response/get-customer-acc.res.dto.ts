import { ApiProperty } from '@nestjs/swagger';

import { IsValidDate } from '@libs/common';
import {
  AccountStatus,
  AccountType,
  CustomerGender,
  CustomerStatus,
  CustomerType,
  DEFAULT_MALE_ACCOUNT_ID,
  DEFAULT_MALE_CUSTOMER_ID,
} from '@libs/database';
import { Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AccountResponseDto {
  @ApiProperty({ example: DEFAULT_MALE_ACCOUNT_ID })
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  id: string;

  @ApiProperty({ example: '0010000001' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'JOHN DOE' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.Active })
  @Expose()
  @IsNotEmpty()
  @IsEnum(AccountStatus)
  status: AccountStatus | string;

  @ApiProperty({ enum: AccountType, example: AccountType.Savings })
  @Expose()
  @IsNotEmpty()
  @IsEnum(AccountType)
  type: AccountType | string;

  @ApiProperty({ example: '980' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  bookBalance: string;

  @ApiProperty({ example: '790' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  availableBalance: string;
}

export class GetCustomerWithAccountsResponseDto {
  @ApiProperty({ example: DEFAULT_MALE_CUSTOMER_ID })
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @ApiProperty({ enum: CustomerType, example: CustomerType.Individual })
  @Expose()
  @IsNotEmpty()
  @IsEnum(CustomerType)
  type: CustomerType | string;

  @ApiProperty({ example: 'JOHN', required: false })
  @Expose()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'DOE', required: false })
  @Expose()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsValidDate()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({
    enum: CustomerGender,
    example: CustomerGender.Male,
    required: false,
  })
  @IsOptional()
  @IsEnum(CustomerGender)
  gender?: CustomerGender | string;

  @ApiProperty({ example: 'Acme Corp Ltd', required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ example: '2020-01-01', required: false })
  @IsValidDate()
  @IsOptional()
  dateOfIncorporation?: string;

  @ApiProperty({ example: '+2348000000000' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '101 Maple Street' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({ example: 'Metropolis' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Central State' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: 'Nigeria' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ enum: CustomerStatus, example: CustomerStatus.Active })
  @Expose()
  @IsEnum(CustomerStatus)
  status: CustomerStatus | string;

  @ApiProperty({ type: () => [AccountResponseDto] })
  @Type(() => AccountResponseDto)
  @Expose()
  accounts: AccountResponseDto[] | null;
}
