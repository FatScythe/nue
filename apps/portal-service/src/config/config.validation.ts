import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

import { Environment, IsMsDuration } from '@libs/common';

import { CookieSameSite } from './types';

class RequiredEnvironmentVariables {
  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment;

  @IsNotEmpty()
  @IsString()
  APP_NAME: string;

  // @IsNumber()
  @IsNotEmpty()
  PORT: number;

  @IsNotEmpty()
  @IsString()
  REDIS_URL: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_NAME: string;

  @IsNotEmpty()
  @IsString()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  FRONTEND_DOMAIN: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  PUBLIC_JWT_SECRET: string;

  @IsNotEmpty()
  @IsString()
  @IsMsDuration()
  PUBLIC_JWT_EXPIRY: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  ACCESS_TOKEN_SECRET: string;

  @IsNotEmpty()
  @IsString()
  @IsMsDuration()
  ACCESS_TOKEN_EXPIRY: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  REFRESH_TOKEN_SECRET: string;

  @IsNotEmpty()
  @IsString()
  @IsMsDuration()
  REFRESH_TOKEN_EXPIRY: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  COOKIE_SECRET: string;

  @IsOptional()
  @IsString()
  @IsEnum(CookieSameSite)
  COOKIE_SAME_SITE?: CookieSameSite;

  @IsOptional()
  @IsEnum(['true', 'false'])
  @IsString()
  COOKIE_SECURE?: string;

  @IsNotEmpty()
  @IsString()
  @IsMsDuration()
  REMEMBER_ME_REFRESH_TOKEN_EXPIRY: string;
}

export function validate<T = Record<string, any>>(
  payload: Record<string, string>,
  validator?: any,
): T {
  if (!validator) validator = RequiredEnvironmentVariables;

  const validatedConfig = plainToInstance(validator, payload, {
    enableImplicitConversion: true,
  }) as any;

  const errors = validateSync(validatedConfig as object, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
