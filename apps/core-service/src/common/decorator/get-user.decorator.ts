import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiException } from '../exception';
import { ApiErrorCode } from '../enums';
import { CoreRequest } from '@common/interfaces';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<CoreRequest>();

    if (!request.user) {
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'An unexpected error occurred while identifying the client.',
        { error_code: 'GU0001' },
      );
    }

    return data ? request.user[data] : request.user;
  },
);
