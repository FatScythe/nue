import { Expose, Type } from 'class-transformer';
import { IsString, IsNumber, ValidateNested, IsObject } from 'class-validator';

export class AccessTokenDataDto {
  @Expose()
  @IsString()
  accessToken: string;

  @Expose()
  @IsNumber()
  expiresIn: number;

  @Expose()
  @IsString()
  tokenType: string = 'Bearer';
}

export class GetAccessRespDto {
  @Expose()
  @IsString()
  message: string;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => AccessTokenDataDto)
  data: AccessTokenDataDto;
}
