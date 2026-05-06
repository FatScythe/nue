import { uuidv7 } from 'uuidv7';
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { accountLiens } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { LienStatus } from '@database/enums';

@Injectable()
export class AccountRepository extends BaseRepository<typeof accountLiens> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, accountLiens);
  }

  async transformAndValidate(
    data: typeof accountLiens.$inferInsert,
  ): Promise<typeof accountLiens.$inferInsert> {
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
