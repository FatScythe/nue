import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeCondition, SCOPES_KEY } from '../../common/decorator';
import { ApiException } from '../../common/exception';
import { ApiErrorCode } from '../../common/enums';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<ScopeCondition[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScopes) return true;

    const { user } = context.switchToHttp().getRequest();
    const userScopes = user?.scopes || [];

    // helper to evaluate nested requirements...
    const checkMatch = (required: ScopeCondition): boolean => {
      if (Array.isArray(required)) {
        // [[]] - AND...
        return required.every((s) => checkMatch(s));
      }

      return userScopes.includes(required);
    };

    // the top level is an OR: If any of the provided conditions match, let them in.
    const canPass = requiredScopes.some((condition) => checkMatch(condition));

    if (!canPass) {
      throw new ApiException(
        ApiErrorCode.AccessForbidden,
        'The provided credentials do not have the required scopes for this resource.',
        {
          error_code: 'SCG001',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
