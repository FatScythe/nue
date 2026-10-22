import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SCOPE_KEY, ScopeCondition } from '../../common/decorator';
import { ApiErrorCode } from '../../common/enums';
import { ApiException } from '../../common/exception';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<ScopeCondition[]>(
      SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScope) return true;

    const { user } = context.switchToHttp().getRequest();
    const userScopes: string[] = user?.scopes || [];

    // Check if user has at least one scope starting with the required resource prefix (e.g. "account:")
    const canPass = requiredScope.some((resource) =>
      userScopes.some((scope) => scope.startsWith(`${resource}:`)),
    );

    if (!canPass) {
      throw new ApiException(
        ApiErrorCode.AccessForbidden,
        'the provided credentials do not have the required scopes for this resource.',
        { error_code: 'SCG001' },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
