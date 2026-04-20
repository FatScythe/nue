import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

import * as schema from '@app/database/schemas';
import { BaseRepository } from '@app/database/base.repository';
import { accounts } from '@app/database/schemas';
import { DATABASE_CONNECTION } from '@app/database/database.provider';

@Injectable()
export class AccountRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db);
  }

  async getBalance(accountId: string, tenantId: string) {
    const result = await this.db
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
