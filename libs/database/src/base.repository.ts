import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from './schemas';
import { DATABASE_CONNECTION } from './database.provider';

export abstract class BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {}

  protected getClient(tx?: any) {
    return tx || this.db;
  }
}
