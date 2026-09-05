import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

import { IsMsDuration } from '@common';

import { Environment } from './types';

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
  @MinLength(8)
  JWT_SECRET: string;

  @IsNotEmpty()
  @IsString()
  @IsMsDuration()
  JWT_EXPIRY: string;
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
