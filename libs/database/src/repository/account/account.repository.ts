import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { accounts } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { DBTransaction } from '@database/types';
import { AccountStatus } from '@database/enums';

@Injectable()
export class AccountRepository extends BaseRepository<typeof accounts> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, accounts);
  }

  async transformAndValidate(
    data: typeof accounts.$inferInsert,
  ): Promise<typeof accounts.$inferInsert> {
    const {
      tenantId,
      productId,
      customerId,
      accountNumber,
      accountName,
      createdBy,
    } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'ACCOUNT',
      },
    };

    if (!tenantId)
      throw new Error('tenant id is required to open an account', errOpt);

    if (!productId)
      throw new Error(
        'product id is required. Every account must belong to a product',
        errOpt,
      );

    if (!customerId)
      throw new Error('customer id is required to link this account', errOpt);

    if (!createdBy) throw new Error('creator user id is required', errOpt);

    if (accountNumber && accountNumber.length < 10) {
      throw new Error('Account number must be at least 10 digits', errOpt);
    }

    return {
      ...data,
      ...(accountName && { accountName: accountName.toUpperCase().trim() }),
      status: data.status || AccountStatus.Pending,
      balance: 0n,
      bookBalance: 0n,
    };
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
