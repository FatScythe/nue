import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';

// workspace services
import { AuthService as GAuthService } from '@auth/auth.service';
import { REDIS_CLIENT } from '@database/redis.provider';

import { Redis } from 'ioredis';
import { GetAccessRespDto } from './dto';
import { plainToInstance } from 'class-transformer';
import { CoreReqUser } from '@common/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly globalAuthService: GAuthService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getAccessToken(user: CoreReqUser): Promise<GetAccessRespDto> {
    const userId = user.id;

    if (!userId)
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'GAT001: request could not be processed. try again later',
        { error_code: 'GAT001' },
      );

    const expiresIn = 5 * 60;
    const cacheKey = `accesstoken_${user.id}`;

    try {
      const cachedToken = await this.redis.get(cacheKey);

      if (cachedToken) {
        const ttl = await this.redis.ttl(cacheKey);

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

    const { access_token } = await this.globalAuthService.generateToken(
      {
        sub: userId,
      },
      { expiresIn },
    );

    try {
      await this.redis.setex(cacheKey, expiresIn, access_token);
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
}
