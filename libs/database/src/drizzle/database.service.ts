import { Inject, Injectable } from '@nestjs/common';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import * as schema from '@database/drizzle/schemas';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly db: NodePgDatabase<typeof schema>,
  ) {}
}
