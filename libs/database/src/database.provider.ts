// libs/database/src/database.provider.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import * as schema from './schemas';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const DatabaseProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: (configService: ConfigService) => {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    const poolSize = configService.get<number>('DB_POOL_SIZE', 10);

    const pool = new Pool({
      connectionString,
      max: poolSize,
      idleTimeoutMillis: 30000,
    });

    return drizzle(pool, { schema });
  },
  inject: [ConfigService],
};
