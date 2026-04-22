import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import { ValidationError } from 'class-validator';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ApiErrorCode.InternalServerError;
    let message = 'An unexpected error occurred';
    let meta: Record<string, any> = {};

    // handle custom exception...
    if (exception instanceof ApiException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse() as any;
      errorCode = res.errorCode;
      message = res.message;
      meta = res.meta || {};
    }
    // handle the specific case where exception is an Array of ValidationErrors
    else if (
      Array.isArray(exception) &&
      exception[0] instanceof ValidationError
    ) {
      httpStatus = HttpStatus.BAD_REQUEST;
      errorCode = ApiErrorCode.ValidationError;
      message = 'Validation failed';
      meta = { errors: this.formatErrors(exception) };
    }
    // handle standard nestjs HttpExceptions (which might wrap ValidationErrors)
    else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse() as any;

      // if nestjs wrapped the errors in a BadRequestException
      if (Array.isArray(res.message) && typeof res.message[0] === 'string') {
        errorCode = ApiErrorCode.ValidationError;
        message = 'Validation failed';
        meta = { errors: res.message };
      } else {
        errorCode = res.error || ApiErrorCode.BadRequest;
        message = res.message || 'Request could not be processed';
      }
    } else {
      this.logger.error('Unhandled System Error', exception);
    }

    const responseBody = {
      success: false,
      statusCode: httpStatus,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      meta,
    };

    httpAdapter.reply(response, responseBody, httpStatus);
  }

  /**
   * Recursively flattens ValidationErrors for the meta block
   */
  private formatErrors(errors: ValidationError[]) {
    return errors.map((err) => {
      return {
        field: err.property,
        errors: err.constraints
          ? Object.values(err.constraints)
          : this.formatErrors(err.children || []),
      };
    });
  }
}
