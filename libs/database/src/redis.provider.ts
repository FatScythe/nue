import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { URL } from 'url';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService) => {
    const redisUrl = config.getOrThrow<string>('REDIS_URL');
    const parsed = new URL(redisUrl);

    const dbIndex =
      parsed.pathname && parsed.pathname.length > 1
        ? parseInt(parsed.pathname.substring(1), 10)
        : 0;

    return new Redis({
      host: parsed.hostname || '127.0.0.1',
      port: Number(parsed.port) || 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: isNaN(dbIndex) ? 0 : dbIndex,
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 50, 2000);
      },
    });
  },
  inject: [ConfigService],
};
