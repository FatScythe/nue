import { Injectable, OnModuleInit } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public db!: PostgresJsDatabase<typeof schema>;

  onModuleInit() {
    const queryClient = postgres(process.env.DATABASE_URL!, { max: 20,  });
    this.db = drizzle(queryClient, { schema });
  }
}
