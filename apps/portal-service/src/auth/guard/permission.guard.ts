import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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

    const userPermissions = user?.role?.permissions;

    if (!userPermissions) {
      throw new ForbiddenException('access to resource is forbidden');
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
