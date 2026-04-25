import { Global, Module, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  DATABASE_CONNECTION,
  DrizzleProvider,
} from '@database/drizzle.provider';
import { CustomerRepository } from '@database/repository/customer';
import { AccountRepository } from '@database/repository/account';
import { UserRepository } from '@database/repository/user';
import { REDIS_CLIENT, RedisProvider } from '@database/redis.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DrizzleProvider,
    RedisProvider,
    CustomerRepository,
    AccountRepository,
    UserRepository,
  ],
  exports: [
    DATABASE_CONNECTION,
    REDIS_CLIENT,
    CustomerRepository,
    AccountRepository,
    UserRepository,
  ],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: any) {}

  /**
   * safety: ensure the connection pool is closed
   * when the Core, Portal, or Worker service stops.
   */
  async onApplicationShutdown() {
    const pool = (this.db as any).$client;
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log('Database connection pool closed safely.');
    }
  }
}
