import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

import { Response } from 'express';

import { CoreException } from '../exceptions/core.exception';

@Catch(CoreException)
export class CoreExceptionFilter implements ExceptionFilter {
  catch(exception: CoreException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(exception.httpStatus).json({
      result: null,
      errorCode: exception.code,
      error: exception.message,
      details: exception.details || null,
    });
  }
}
