import { PaginationMetaResponseDto } from '@common/dto/reponse.dto';
import { CustomerGender, CustomerStatus, CustomerType } from '@database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class GetAllCustomerRespDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the customer',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email address of the customer',
  })
  @Expose()
  emailAddress: string;

  @ApiPropertyOptional({
    example: 'Jane',
    description: 'First name of the individual customer',
  })
  @Expose()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Smith',
    description: 'Last name of the individual customer',
  })
  @Expose()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Business name of the corporate customer',
  })
  @Expose()
  businessName?: string;

  @ApiProperty({
    enum: CustomerStatus,
    example: CustomerStatus.Active,
    description:
      'Current status of the customer account (e.g., Active, Frozen)',
  })
  @Expose()
  status: string | CustomerStatus;

  @ApiPropertyOptional({
    description: 'Date of birth of the customer',
    example: '1999-10-01',
  })
  @Expose()
  dateOfBirth?: string;

  @ApiProperty({
    example: '+23490956XXXX',
    description: 'Primary phone number',
  })
  @Expose()
  phoneNumber: string;

  @ApiPropertyOptional({
    enum: CustomerGender,
    example: CustomerGender.Female,
    description: 'Gender of the customer',
  })
  @Expose()
  gender?: string | CustomerGender;

  @ApiProperty({
    enum: CustomerType,
    example: CustomerType.Individual,
    description: 'Type of customer (e.g., Individual, Corporate)',
  })
  @Expose()
  type: string | CustomerType;

  @ApiPropertyOptional({
    description: 'Date of incorporation for businesses',
    example: '2020-01-01',
    required: false,
  })
  @Expose()
  dateOfIncorporation?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @Expose()
  street?: string;

  @ApiPropertyOptional({ description: 'State or province' })
  @Expose()
  state?: string;

  @ApiPropertyOptional({ description: 'City' })
  @Expose()
  city?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @Expose()
  country?: string;
}

export class PaginatedCustomersResponseDto {
  @ApiProperty({ type: () => [GetAllCustomerRespDto] })
  @Expose()
  @Type(() => GetAllCustomerRespDto)
  data: GetAllCustomerRespDto[];

  @ApiProperty({ type: () => PaginationMetaResponseDto })
  @Expose()
  @Type(() => PaginationMetaResponseDto)
  meta: PaginationMetaResponseDto;
}
