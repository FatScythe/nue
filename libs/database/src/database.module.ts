import { Global, Module, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  DATABASE_CONNECTION,
  DatabaseProvider,
} from '@app/database/database.provider';
import { CustomerRepository } from '@app/database/repository/customer';
import { AccountRepository } from '@app/database/repository/account';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseProvider, CustomerRepository, AccountRepository],
  exports: [DATABASE_CONNECTION, CustomerRepository, AccountRepository],
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
