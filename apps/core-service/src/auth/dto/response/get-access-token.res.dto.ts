import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsString, IsNumber, ValidateNested, IsObject } from 'class-validator';

export class AccessTokenDataDto {
  @ApiProperty({
    description: 'JWT access token for authenticating subsequent requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'Token validity period in seconds',
    example: 300,
  })
  @Expose()
  @IsNumber()
  expiresIn: number;

  @ApiProperty({
    description: 'Token type prefix',
    example: 'Bearer',
    default: 'Bearer',
  })
  @Expose()
  @IsString()
  tokenType: string = 'Bearer';
}

export class GetAccessRespDto {
  @ApiProperty({
    description: 'Dynamic response message',
    example: 'token will expire in 5 minutes',
  })
  @Expose()
  @IsString()
  message: string;

  @ApiProperty({ type: () => AccessTokenDataDto })
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => AccessTokenDataDto)
  data: AccessTokenDataDto;
}
