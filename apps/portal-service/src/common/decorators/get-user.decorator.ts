import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CoreReqUser } from '@libs/common';

export const GetUser = createParamDecorator(
  (data: keyof CoreReqUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (request.user) {
      return data ? request.user[data] : request.user;
    } else {
      return {};
    }
  },
);
