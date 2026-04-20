import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@app/database/schemas';
import { BaseRepository } from '@app/database/base.repository';
import { customers } from '@app/database/schemas';
import { DATABASE_CONNECTION } from '@app/database/database.provider';

@Injectable()
export class CustomerRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db);
  }

  /**
   * Create a new customer profile
   */
  async create(data: typeof customers.$inferInsert, tx?: any) {
    const result = await this.getClient(tx)
      .insert(customers)
      .values(data)
      .returning();
    return result[0];
  }
}
