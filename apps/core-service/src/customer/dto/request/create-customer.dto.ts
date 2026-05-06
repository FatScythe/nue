import { IsValidDate, IsValidReference } from '@lib/common/src/validators';
import { CustomerGender, CustomerTier, CustomerType } from '@database/enums';
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
  @IsEnum(CustomerType)
  @IsString()
  @IsNotEmpty()
  type: CustomerType;

  @IsEnum(CustomerTier)
  @IsString()
  @IsNotEmpty()
  tierLevel: CustomerTier = CustomerTier.TierZero;

  @IsBoolean()
  @IsOptional()
  activateCustomer?: boolean = false;

  @IsInt()
  @IsNotEmpty()
  officeId: number;

  @IsBoolean()
  @IsOptional()
  createSavingsAccount: boolean = false;

  @ValidateIf((dto) => dto.createSavingsAccount)
  @IsInt()
  @IsNotEmpty({
    message: 'product id is required to create an customer account',
  })
  productId: number;

  @IsOptional()
  @IsValidDate()
  createdDate: string = moment().format('YYYY-MM-DD');

  @ValidateIf((dto) => dto.type === CustomerType.Corporate)
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ValidateIf((dto) => dto.type === CustomerType.Corporate)
  @IsValidDate()
  @IsNotEmpty()
  dateOfIncorporation: string;

  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsValidDate()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsEnum(CustomerGender)
  @IsString()
  @IsNotEmpty()
  gender: CustomerGender = CustomerGender.Nil;

  @IsOptional()
  @IsValidReference()
  @IsString()
  externalId?: string;

  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ValidateIf((dto) => dto.type === CustomerType.Individual)
  @IsString()
  @IsOptional()
  middleName?: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}
