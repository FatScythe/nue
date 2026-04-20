import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, validateSync } from 'class-validator';
import { Environment } from './types';

class RequiredEnvironmentVariables {
  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment;

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
