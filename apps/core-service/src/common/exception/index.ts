import { HttpException, HttpStatus } from '@nestjs/common';

export default class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.constructor = ConfigError;
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

export class ApiException extends HttpException {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ message, isClientError: true, ...meta }, HttpStatus.BAD_REQUEST);
  }
}
