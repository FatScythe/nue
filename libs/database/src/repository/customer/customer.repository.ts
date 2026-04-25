import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { customers } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { DBTransaction } from '@database/types';

@Injectable()
export class CustomerRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db);
  }

  /**
   * create a new customer profile...
   */
  async create(data: typeof customers.$inferInsert, tx?: DBTransaction) {
    const result = await this.getClient(tx)
      .insert(customers)
      .values(data)
      .returning();
    return result[0];
  }
}
