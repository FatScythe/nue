import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';

import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CustomResponse } from '../types';
import { formatResponse } from './utils';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  CustomResponse<T> | StreamableFile | Buffer
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<CustomResponse<T> | StreamableFile | Buffer> {
    const httpContext = context.switchToHttp();
    const responseObj = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((response: any) => {
        if (response instanceof StreamableFile) {
          return response;
        }

        if (response instanceof Buffer) {
          return response;
        }

        const {
          message,
          data = null,
          _statusCode,
          meta = null,
          ...extraData
        } = response || {};

        if (_statusCode) {
          responseObj.status(response._statusCode);
          // clean up the status code so it doesn't show in the final JSON data
          delete response._statusCode;
        }

        const formattedData = formatResponse(data ?? extraData);

        return {
          status: 'successful',
          message: message ?? 'request successful',
          data: formattedData,
          meta,
        };
      }),
    );
  }
}
