import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { and, eq, SQL } from 'drizzle-orm';

import { IS_NON_TOKEN, IS_PUBLIC_KEY } from '../../common/decorator';
import { ApiException } from '../../common/exception';
import { ApiErrorCode } from '../../common/enums';

import { AuthService } from '@auth';

import { UserRepository } from '@database/repository';
import { users } from '@database/schemas';
import { Resources, UserStatus, UserType } from '@database/enums';
import { CoreRequest } from '@lib/common/src/interfaces';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private readonly userRepo: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const isNoToken = this.reflector.getAllAndOverride<boolean>(IS_NON_TOKEN, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<CoreRequest>();

    if (isNoToken) {
      return this.validateNonTokenRequest({
        request,
      });
    }

    return this.validateTokenRequest({ request });
  }

  async validateNonTokenRequest({
    request,
  }: {
    request: CoreRequest;
  }): Promise<boolean> {
    const key = request.headers['nue-sec-key'] as string;

    if (!key || !key.startsWith('nsk_') || key.length < 20) {
      throw new ApiException(
        ApiErrorCode.InvalidAuthKey,
        'invalid credentials format',
        { error_code: 'VNTR001' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const queryCondition = and(
      eq(users.secretKey, key),
      eq(users.status, UserStatus.Active),
      eq(users.type, UserType.Api),
    ) as SQL;

    return this.validateRequest({ request, queryCondition });
  }

  async validateTokenRequest({
    request,
  }: {
    request: CoreRequest;
  }): Promise<boolean> {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiException(
        ApiErrorCode.InvalidAuthKey,
        'invalid credentials',
        { error_code: 'VTR001' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = await this.authService.validateToken(token);

    if (!decoded || !decoded.sub)
      throw new ApiException(
        ApiErrorCode.AccessForbidden,
        'invalid or expired token',
        { error_code: 'VTR002' },
      );

    const queryCondition = and(
      eq(users.status, UserStatus.Active),
      eq(users.id, decoded.sub),
      eq(users.type, UserType.Api),
    ) as SQL;

    return this.validateRequest({ request, queryCondition });
  }

  async validateRequest({
    request,
    queryCondition,
  }: {
    request: CoreRequest;
    queryCondition: SQL<unknown>;
  }): Promise<boolean> {
    const user = await this.userRepo.findOneWithScope(queryCondition);
    if (!user) {
      throw new ApiException(
        ApiErrorCode.InvalidAuthKey,
        'invalid credentials',
        { error_code: 'AVR001' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.whitelistedIps && user.whitelistedIps?.length) {
      const incomingIp =
        request.ip || (request.headers['x-forwarded-for'] as string);

      if (!incomingIp) {
        throw new ApiException(
          ApiErrorCode.AccessForbidden,
          `invalid credentials.`,
          { error_code: 'AVR002' },
          HttpStatus.FORBIDDEN,
        );
      }

      const normalizedIp = incomingIp === '::1' ? '127.0.0.1' : incomingIp;

      const isAllowed = user.whitelistedIps.includes(normalizedIp);

      if (!isAllowed) {
        throw new ApiException(
          ApiErrorCode.IpNotWhitelisted,
          `IP address ${incomingIp} is not authorized for this secret key.`,
          { error_code: 'AVR003' },
        );
      }
    }

    if (!user.id || !user.tenantId) {
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'User or Tenant context is missing',
        { error_code: 'AVR004' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const reqUser = {
      id: user.id,
      secretKey: user.secretKey ?? '',
      whitelistedIps: user.whitelistedIps ?? [],
      type: user.type as UserType,
      scopes: (user.scopes || []) as Resources[],
      tenantId: user.tenantId,
    };

    request['user'] = reqUser;

    return true;
  }
}
