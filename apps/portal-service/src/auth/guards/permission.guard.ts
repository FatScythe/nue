import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Environment } from '@libs/common';
import { DEFAULT_PERMISSION } from '@libs/database';

import { PERMISSION_CHECK_KEY, RequiredPermission } from '../decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authorization = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!authorization) return true;

    const { user } = context.switchToHttp().getRequest();

    const { resource, action } = authorization;
    const userPermissions = user?.role?.permissions;

    if (!userPermissions) {
      throw new ForbiddenException('access to resource is forbidden');
    }

    // development check for missing keys in the permission object
    if (process.env.NODE_ENV === Environment.Development) {
      if (
        typeof (DEFAULT_PERMISSION as any)?.[resource]?.[action] === 'undefined'
      ) {
        throw new ForbiddenException(
          `invalid authorization resource: ${resource}, does not have an action: ${action}`,
        );
      }
    }

    const hasPermission =
      userPermissions[authorization.resource]?.[authorization.action] === true;

    if (!hasPermission) {
      throw new ForbiddenException(
        `insufficient privilege: required ${authorization.action} on ${authorization.resource}`,
      );
    }

    return true;
  }
}
