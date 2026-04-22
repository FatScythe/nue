import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/database.provider';
import { DatabaseClient, DBTransaction } from '@database/types';
import { SQL, TableConfig } from 'drizzle-orm';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';

export abstract class BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {}

  protected getClient(tx?: DBTransaction): DatabaseClient {
    // If 'tx' exists, we use it (ensuring ACID compliance)
    // otherwise, we use the main pool...
    return tx || this.db;
  }
}
