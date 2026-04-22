import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { accounts } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/database.provider';
import { DBTransaction } from '@database/types';

@Injectable()
export class AccountRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db);
  }

  async getBalance(
    { accountId, tenantId }: { accountId: string; tenantId: string },
    tx?: DBTransaction,
  ) {
    const result = await this.getClient(tx)
      .select({ balance: accounts.balance, bookBalance: accounts.bookBalance })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
      .limit(1);

    return {
      balance: result[0]?.balance ?? 0n,
      bookBalance: result[0]?.balance ?? 0n,
    };
  }
}
