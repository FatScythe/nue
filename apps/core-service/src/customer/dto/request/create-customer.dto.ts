import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidDate, IsValidReference } from '@lib/common/src/validators';
import {
  CustomerGender,
  CustomerTier,
  CustomerType,
} from '@database/drizzle/enums';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
import moment from 'moment';

export class CreateCustomerDto {
  @ApiProperty({
    enum: CustomerType,
    description: 'Type of customer being created',
    example: CustomerType.Individual,
  })
  @IsEnum(CustomerType)
  @IsString()
  @IsNotEmpty()
  type: CustomerType;

  @ApiProperty({
    enum: CustomerTier,
    description: 'Customer tier classification level',
    default: CustomerTier.TierZero,
    example: CustomerTier.TierZero,
  })
  @IsEnum(CustomerTier)
  @IsString()
  @IsNotEmpty()
  tierLevel: CustomerTier = CustomerTier.TierZero;

  @ApiPropertyOptional({
    description:
      'Flag indicating whether to immediately activate customer account',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  activateCustomer?: boolean = false;

  @ApiProperty({
    description: 'Unique identifier of the assigned office',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  officeId: number;

  @ApiPropertyOptional({
    description:
      'Flag indicating whether to create an associated savings account',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  createSavingsAccount: boolean = false;

  // @ValidateIf((dto) => dto.createSavingsAccount)
  // @IsInt()
  // @IsNotEmpty({
  //   message: 'product id is required to create an customer account',
  // })
  // productId: number;

  @ApiPropertyOptional({
    description: 'Date of creation in YYYY-MM-DD format',
    example: '2026-07-30',
  })
  @IsOptional()
  @IsValidDate()
  createdDate: string = moment().format('YYYY-MM-DD');

  @ApiPropertyOptional({
    description: 'Business name (Required if customer type is Corporate)',
    example: 'Acme Technologies Ltd',
  })
  @ValidateIf((dto) => dto.type === CustomerType.Corporate)
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiPropertyOptional({
    description:
      'Date of incorporation in YYYY-MM-DD format (Required if customer type is Corporate)',
    example: '2020-01-15',
  })
  @ValidateIf((dto) => dto.type === CustomerType.Corporate)
  @IsValidDate()
  @IsNotEmpty()
  dateOfIncorporation: string;

  @ApiPropertyOptional({
    description:
      'Date of birth in YYYY-MM-DD format (Required if customer type is Individual)',
    example: '1995-05-20',
  })
  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsValidDate()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({
    description: 'Primary contact email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @ApiPropertyOptional({
    enum: CustomerGender,
    description:
      'Gender of the customer (Applicable if customer type is Individual)',
    default: CustomerGender.Nil,
    example: CustomerGender.Nil,
  })
  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsEnum(CustomerGender)
  @IsString()
  @IsNotEmpty()
  gender: CustomerGender = CustomerGender.Nil;

  @ApiPropertyOptional({
    description: 'External reference identifier from third-party systems',
    example: 'EXT-987654321',
  })
  @IsOptional()
  @IsValidReference()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({
    description: 'First name (Required if customer type is Individual)',
    example: 'John',
  })
  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({
    description: 'Last name (Required if customer type is Individual)',
    example: 'Doe',
  })
  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Middle name of the individual',
    example: 'Alexander',
  })
  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({
    description: 'Primary contact phone number',
    example: '+2348012345678',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'State/Province of address',
    example: 'Lagos',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Street address details',
    example: '123 Commercial Avenue',
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    description: 'City of address',
    example: 'Ikeja',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'Country of address',
    example: 'Nigeria',
  })
  @IsString()
  @IsNotEmpty()
  country: string;
}
