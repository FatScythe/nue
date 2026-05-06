import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { isObject, isString, formatReponse } from '@utils';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const responseObj = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((response) => {
        let message = 'request successful';
        let rawData: any = null;
        let meta: any = null;

        if (isObject(response)) {
          const target = response.data ?? response;

          rawData = instanceToPlain(target, {
            strategy: 'excludeAll',
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          });

          const { message: customMsg, meta: customMeta, ...extra } = response;

          message = customMsg ?? message;
          meta = customMeta || {};
        } else if (isString(response)) {
          rawData = response;
        }

        const formattedData = formatReponse(rawData);

        return {
          success: true,
          statusCode: responseObj.statusCode,
          message,
          data: formattedData,
          meta,
        };
      }),
    );
  }
}
