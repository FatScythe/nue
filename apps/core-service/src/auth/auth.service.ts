import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// libs...
import { plainToInstance } from 'class-transformer';
import { CoreReqUser } from '@common';
import { RedisService } from '@database';

import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import { GetAccessRespDto } from './dto';
import { configuration } from '../config';
import { Environment } from '../config/types';

const isDev = configuration().nodeEnv === Environment.Development;
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async getAccessToken(user: CoreReqUser): Promise<GetAccessRespDto> {
    const userId = user.id;

    if (!userId)
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'GAT001: request could not be processed. try again later',
        { error_code: 'GAT001' },
      );

    const expiresIn = isDev ? 24 * 60 * 60 : 5 * 60;
    const cacheKey = `accesstoken_${user.id}`;

    try {
      const cachedToken = await this.redisService.get(cacheKey);

      if (cachedToken) {
        const ttl = await this.redisService.getTTL(cacheKey);

        return plainToInstance(GetAccessRespDto, {
          message: `token will expire in ${Math.ceil(ttl / 60)} minutes`,
          data: {
            accessToken: cachedToken,
            expiresIn: ttl > 0 ? ttl : expiresIn,
            tokenType: 'Bearer',
          },
        });
      }
    } catch (error) {
      this.logger.error({ message: 'Error accessing redis cache', error });
    }

    const { access_token } = await this.generateToken(
      {
        sub: userId,
      },
      { expiresIn },
    );

    try {
      await this.redisService.setEx(cacheKey, expiresIn, access_token);
    } catch (error) {
      this.logger.error({ message: 'Error setting redis cache', error });
    }

    return plainToInstance(GetAccessRespDto, {
      message: `token will expire in ${expiresIn / 60} minutes`,
      data: {
        accessToken: access_token,
        expiresIn: expiresIn,
        tokenType: 'Bearer',
      },
    });
  }

  async generateToken(
    payload: { sub: string; email: string } | { sub: string },
    options?: {
      expiresIn?: number;
    },
  ) {
    return {
      access_token: this.jwtService.sign(payload, {
        ...(options?.expiresIn && { expiresIn: options.expiresIn }),
      }),
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}
