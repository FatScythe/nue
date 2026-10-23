import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { eq } from 'drizzle-orm';

import { DEFAULT_PERMISSION, UserRepository, Users } from '@libs/database';
import { Environment, PortalReqUser } from '@libs/common';

import { PERMISSION_CHECK_KEY, RequiredPermission } from '../decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userRepo: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authorization = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!authorization) return true;

    const request = context.switchToHttp().getRequest() as Request & {
      user: PortalReqUser;
    };

    const user = request.user;

    const { resource, action } = authorization;
    const dbUser = await this.userRepo.findOneWithRole(eq(Users.id, user.sub));

    if (!dbUser)
      throw new ForbiddenException(
        'Invalid user, access to resource is forbidden',
      );

    const userPermissions = dbUser?.role?.permissions;

    if (!userPermissions) {
      throw new ForbiddenException('Access to resource is forbidden');
    }

    // development check for missing keys in the permission object
    if (process.env.NODE_ENV === Environment.Development) {
      if (typeof DEFAULT_PERMISSION?.[resource]?.[action] === 'undefined') {
        throw new ForbiddenException(
          `Invalid authorization resource: ${resource}, does not have an action: ${action}`,
        );
      }
    }

    const hasPermission =
      userPermissions[authorization.resource]?.[authorization.action] === true;

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient privilege: required ${authorization.action} on ${authorization.resource}`,
      );
    }

    request['user'] = {
      ...user,
      status: dbUser.status,
      emailAddress: dbUser.emailAddress,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      middleName: dbUser.middleName,
      otpKey: dbUser.otpKey,
    };

    return true;
  }
}
