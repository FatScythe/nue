import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { isObject, isString, formatReponse } from '@utils';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const responseObj = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((response) => {
        let message = 'request successful';
        let data: any = null;

        if (isObject(response)) {
          const { message: customMsg, data: customData, ...extra } = response;
          message = customMsg ?? message;
          data = customData ?? (Object.keys(extra).length ? extra : null);
        } else if (isString(response)) {
          data = response;
        }

        const formattedData = formatReponse(data);

        return {
          success: true,
          statusCode: responseObj.statusCode,
          message,
          data: formattedData,
        };
      }),
    );
  }
}
