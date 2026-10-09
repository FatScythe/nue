import { Inject, Injectable } from '@nestjs/common';

import { BaseRepository } from '@libs/database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@libs/database/drizzle/drizzle.provider';
import { LienStatus } from '@libs/database/drizzle/enums';
import * as schema from '@libs/database/drizzle/schemas';
import { Liens } from '@libs/database/drizzle/schemas';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class LienRepository extends BaseRepository<typeof Liens> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, Liens);
  }

  async transformAndValidate(
    data: typeof Liens.$inferInsert,
  ): Promise<typeof Liens.$inferInsert> {
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
