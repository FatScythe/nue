import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../enums';

export default class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.constructor = ConfigError;
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

export class ApiException extends HttpException {
  constructor(
    public readonly errorCode: ApiErrorCode,
    message: string,
    public readonly meta?: { error_code?: string; [key: string]: unknown },
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        success: false,
        statusCode: status,
        errorCode,
        message,
        meta,
      },
      status,
    );
  }
}
