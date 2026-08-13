import { IsValidDate } from '@common';
import { CustomerStatus, CustomerType } from '@database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatedByUserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  @IsUUID(7)
  id: string;

  @ApiProperty({ example: 'John' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Expose()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;
}

export class GetSingleCustomerResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the customer',
  })
  @Expose()
  @IsNotEmpty()
  @IsUUID(7)
  id: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Email address of the customer',
  })
  @Expose()
  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @ApiPropertyOptional({
    example: 'Jane',
    description: 'First name of the individual customer',
  })
  @Expose()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Smith',
    description: 'Last name of the individual customer',
  })
  @Expose()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Business name of the corporate customer',
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Date of birth of the customer',
    example: '1999-10-01',
  })
  @Expose()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Date of incorporation for businesses',
    example: '2020-01-01',
  })
  @Expose()
  dateOfIncorporation?: string;

  @ApiProperty({ example: CustomerStatus.Active, enum: CustomerStatus })
  @Expose()
  @IsEnum(CustomerStatus)
  status: string | CustomerStatus;

  @ApiProperty({ example: CustomerType.Individual, enum: CustomerType })
  @Expose()
  @IsEnum(CustomerType)
  type: string | CustomerType;

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

  @ApiProperty({ example: '2026-04-01T12:00:00.000Z' })
  @Expose()
  @IsValidDate()
  createdAt: string;

  @ApiProperty({ type: () => CreatedByUserResponseDto, required: false })
  @Type(() => CreatedByUserResponseDto)
  @Expose()
  createdBy?: CreatedByUserResponseDto;
}
