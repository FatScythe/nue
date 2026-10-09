import { Inject, Injectable } from '@nestjs/common';

import { BaseRepository } from '@libs/database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@libs/database/drizzle/drizzle.provider';
import { TransactionStatus } from '@libs/database/drizzle/enums';
import * as schema from '@libs/database/drizzle/schemas';
import { Transactions } from '@libs/database/drizzle/schemas';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class TransactionRepository extends BaseRepository<typeof Transactions> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, Transactions);
  }

  async transformAndValidate(
    data: typeof Transactions.$inferInsert,
  ): Promise<typeof Transactions.$inferInsert> {
    const { tenantId, createdBy } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'TRANSACTION',
      },
    };

    if (!tenantId)
      throw new Error('tenant id is required to perform a transaction', errOpt);

    if (!createdBy) throw new Error('creator user id is required', errOpt);

    return {
      ...data,
      id: uuidv7(),
      status: data.status || TransactionStatus.PendingApproval,
    };
  }
}
