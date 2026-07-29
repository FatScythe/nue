import { uuidv7 } from 'uuidv7';
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/drizzle/schemas';
import { BaseRepository } from '@database/drizzle/base.repository';
import { transactions } from '@database/drizzle/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { TransactionStatus } from '@database/drizzle/enums';

@Injectable()
export class TransactionRepository extends BaseRepository<typeof transactions> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, transactions);
  }

  async transformAndValidate(
    data: typeof transactions.$inferInsert,
  ): Promise<typeof transactions.$inferInsert> {
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
