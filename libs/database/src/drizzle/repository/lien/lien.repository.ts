import { Inject, Injectable } from '@nestjs/common';

import { uuidv7 } from 'uuidv7';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/drizzle/schemas';
import { BaseRepository } from '@database/drizzle/base.repository';
import { liens } from '@database/drizzle/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { LienStatus } from '@database/drizzle/enums';

@Injectable()
export class LienRepository extends BaseRepository<typeof liens> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, liens);
  }

  async transformAndValidate(
    data: typeof liens.$inferInsert,
  ): Promise<typeof liens.$inferInsert> {
    const { tenantId, accountId, createdBy } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'ACCOUNT_LIEN',
      },
    };

    if (!tenantId)
      throw new Error('tenant id is required to create a lien', errOpt);

    if (!accountId) throw new Error('account id is required', errOpt);

    if (!createdBy) throw new Error('creator user id is required', errOpt);

    return {
      ...data,
      id: uuidv7(),
      status: data.status || LienStatus.Active,
    };
  }
}
