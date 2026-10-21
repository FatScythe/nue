import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';

import { Request } from 'express';

import { TokenType } from '@libs/database';
import { TokenSessionService } from '@libs/token';
import { PortalReqUser } from '@libs/common';

import { IS_PUBLIC_KEY } from '../../common/decorators';
import { configuration } from '../../config';
import { AuthService } from '../auth.service';

@Injectable()
export class CookieGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private authService: AuthService,
    private readonly tokenService: TokenSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // get header
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // get the public decorator...
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // if public, for e.g register | login endpoints
      return true;
    }

    const config = configuration();

    const [accessToken, refreshToken] = this.extractTokensFromRequest(request);

    if (accessToken) {
      try {
        const payload: PortalReqUser = await this.jwtService.verifyAsync(
          accessToken,
          {
            secret: config.accessTokenSecret,
            algorithms: ['HS256'],
          },
        );

        // validated against MongoDB session store
        await this.validateWhitelist(payload.sub, payload.jti!);

        // attach user to request...
        request['user'] = payload;

        return true;
      } catch (error: any) {
        if ((error as JsonWebTokenError)?.name !== 'TokenExpiredError') {
          throw new UnauthorizedException('CG001: Invalid Credentials');
        }
        // if it reaches here, it means it's a TokenExpiredError....
        // we fall through to the refreshToken logic below...
      }
    }

    if (!refreshToken)
      throw new UnauthorizedException('CG003: Invalid Credentials');

    try {
      const payload = (await this.jwtService.verifyAsync(refreshToken, {
        secret: config.refreshTokenSecret,
        algorithms: ['HS256'],
      })) as PortalReqUser;

      const { rememberMe = false } = await this.validateWhitelist(
        payload.sub,
        payload.jti!,
      );

      // refresh cookies and jti...
      await this.authService.attachCookiesToResponse({
        res: response,
        user: payload,
        rememberMe,
      });

      request['user'] = payload;
    } catch (error) {
      const errorMessage =
        (error as JsonWebTokenError)?.name === 'TokenExpiredError'
          ? 'Session expired, please login again'
          : 'Invalid Credentials';

      throw new UnauthorizedException(`CG002: ${errorMessage}`);
    }

    return true;
  }

  private extractTokensFromRequest(request: Request): [string, string] {
    const { refreshToken = '', accessToken = '' } = request.signedCookies;

    return [accessToken, refreshToken];
  }

  private async validateWhitelist(
    userId: string,
    jti: string,
  ): Promise<{
    rememberMe: boolean;
  }> {
    // verify session token existence and expiration directly from MongoDB via TokenSessionService...
    const session = await this.tokenService.verifyToken(jti, [
      TokenType.Session,
    ]);

    if (!session) {
      throw new UnauthorizedException('CG004: Invalid Credentials');
    }

    try {
      // ensure the session belongs to the correct user...
      if (session.userId !== userId) {
        throw new UnauthorizedException('CG005: Invalid Credentials');
      }
    } catch {
      throw new UnauthorizedException('CG005: Invalid Credentials');
    }

    return {
      rememberMe: !!session.metadata?.rememberMe,
    };
  }
}
