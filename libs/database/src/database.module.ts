import { Global, Module, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  DATABASE_CONNECTION,
  DatabaseProvider,
} from '@database/database.provider';
import { CustomerRepository } from '@database/repository/customer';
import { AccountRepository } from '@database/repository/account';
import { UserRepository } from '@database/repository/user';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseProvider,
    CustomerRepository,
    AccountRepository,
    UserRepository,
  ],
  exports: [
    DATABASE_CONNECTION,
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
