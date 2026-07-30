import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// libs...
import { ApiScope } from '@database';

import { ApiException } from '../../common/exception';
import { ApiErrorCode } from '../../common/enums';
import { PERMISSION_KEY, PermissionCondition } from '../../common/decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionCondition[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const userScopes: ApiScope[] = user?.scopes || [];

    // Helper to evaluate nested requirements (AND / OR)
    const checkMatch = (required: PermissionCondition): boolean => {
      if (Array.isArray(required)) {
        return required.every((s) => checkMatch(s));
      }
      return userScopes.includes(required as ApiScope);
    };

    // Top level is an OR: If any of the conditions match, let them in.
    const canPass = requiredPermissions.some((condition) =>
      checkMatch(condition),
    );

    if (!canPass) {
      throw new ApiException(
        ApiErrorCode.AccessForbidden,
        'the provided credentials do not have the required permissions for this action.',
        { error_code: 'PMG001' },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
