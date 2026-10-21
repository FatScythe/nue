import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationError } from 'class-validator';

const isXML = (str) => /^\s*<[\s\S]*>/.test(str);

const isInternalErrMessage = (message) => {
  try {
    if (message && typeof message === 'string') message = message.toLowerCase();

    return (
      typeof message === 'string' &&
      (isXML(message) ||
        message.includes('internal') ||
        message.includes('timeout'))
    );
  } catch (e) {
    return false;
  }
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger(AllExceptionsFilter.name);
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    let errorMessage = 'Request Could not be Processed';
    let errorDetails: Record<string, any> | string | undefined = {};

    let statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (process?.env?.NODE_ENV === 'development') {
      console.log(exception);
    }

    let errorCode =
      exception instanceof HttpException
        ? 'bad_request'
        : 'internal_server_error';

    if (exception instanceof HttpException || exception instanceof Error) {
      errorCode = 'bad_request';
      errorMessage = exception.message;

      if (exception instanceof HttpException) {
        errorDetails = exception.getResponse();
      } else if (exception instanceof Error) {
        statusCode = 400;
      }
    } else if (
      exception instanceof Array &&
      exception[0] instanceof ValidationError
    ) {
      statusCode = 400;
      errorMessage = 'Validation failed';
      errorCode = 'validation_error';
      errorDetails = exception.map((e: ValidationError) => {
        const { constraints, property, children = [] } = e;
        return {
          field: property,
          message: (Number(children?.length || 0) > 0
            ? children.map(
                (child, idx) => `${Object.values(child.constraints || {})}`,
              )
            : Object.values(constraints || {})
          ).join(' | '),
        };
      });

      errorMessage =
        Array.isArray(errorDetails) && errorDetails?.length
          ? errorDetails[0]?.message
          : 'Validation failed';
    } else if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception
    ) {
      const except = exception as any;

      statusCode = 400;
      errorMessage =
        typeof exception.message === 'string'
          ? exception.message
          : 'request could not be processed';

      errorCode = except?.error || 'bad_request';

      errorDetails = except?.error_details || {};
    } else if (typeof exception === 'string') {
      statusCode = 400;
      errorMessage = exception;

      errorCode = 'bad_request';
    } else {
      this.logger.error(exception);
    }

    if (errorDetails && typeof errorDetails === 'object') {
      if (errorDetails.message) {
        errorMessage = errorDetails.message;
        errorDetails.message = undefined;
      }
      if (errorDetails.statusCode) errorDetails.statusCode = undefined;
    }

    if (errorMessage && isInternalErrMessage(errorMessage)) {
      this.logger.error(exception);

      errorMessage = 'Request Could not be Processed. Please try again later';

      errorDetails = undefined;
    }

    const responseBody = {
      status: 'failed',
      error_description: errorMessage,
      error: errorCode,
      error_details: errorDetails,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }
}
