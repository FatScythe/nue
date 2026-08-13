import { uuidv7 } from 'uuidv7';
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

import * as schema from '@database/drizzle/schemas';
import { BaseRepository } from '@database/drizzle/base.repository';
import {
  accounts,
  loanDetails,
  savingsDetails,
  // fixedDepositDetails,
} from '@database/drizzle/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import { DBTransaction } from '@database/drizzle/types';
import { AccountStatus } from '@database/drizzle/enums';

@Injectable()
export class AccountRepository extends BaseRepository<typeof accounts> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, accounts);
  }

  async createSavingDetails(
    data: typeof savingsDetails.$inferInsert,
    tx?: DBTransaction,
  ): Promise<typeof savingsDetails.$inferSelect | null> {
    const db = tx || this.db;
    const { accountId, tenantId } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'ACCOUNT_SAVINGS',
      },
    };

    if (!tenantId)
      throw new Error(
        'tenant id is required to open a savings account',
        errOpt,
      );

    if (!accountId) throw new Error('parent account id is required', errOpt);

    const result = await db.insert(savingsDetails).values(data);

    return result[0] || null;
  }

  async createLoanDetails(
    data: typeof loanDetails.$inferInsert,
    tx?: DBTransaction,
  ): Promise<typeof loanDetails.$inferSelect | null> {
    const db = tx || this.db;
    const { accountId, tenantId } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'ACCOUNT_LOAN',
      },
    };

    if (!tenantId)
      throw new Error(
        'tenant id is required to open a savings account',
        errOpt,
      );

    if (!accountId) throw new Error('parent account id is required', errOpt);

    const result = await db.insert(loanDetails).values(data);

    return result[0] || null;
  }

  // async createFixedDepositDetails(
  //   data: typeof fixedDepositDetails.$inferInsert,
  // ): Promise<typeof fixedDepositDetails.$inferSelect | null> {
  //   const { accountId, tenantId } = data;

  //   const errOpt = {
  //     cause: {
  //       code: 'VALIDATION_FAILED',
  //       layer: 'REPOSITORY',
  //       module: 'ACCOUNT_FIXED_DEPOSIT',
  //     },
  //   };

  //   if (!tenantId)
  //     throw new Error(
  //       'tenant id is required to open a fixed deposit account',
  //       errOpt,
  //     );

  //   if (!accountId) throw new Error('parent account id is required', errOpt);

  //   const result = await this.db.insert(fixedDepositDetails).values(data);

  //   return result[0] || null;
  // }

  async transformAndValidate(
    data: typeof accounts.$inferInsert,
  ): Promise<typeof accounts.$inferInsert> {
    const {
      tenantId,
      // productId,
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

    // if (!productId)
    //   throw new Error(
    //     'product id is required. Every account must belong to a product',
    //     errOpt,
    //   );

    if (!customerId)
      throw new Error('customer id is required to link this account', errOpt);

    if (!createdBy) throw new Error('creator user id is required', errOpt);

    if (accountNumber && accountNumber.length < 10) {
      throw new Error('Account number must be at least 10 digits', errOpt);
    }

    return {
      ...data,
      id: uuidv7(),
      ...(accountName && { accountName: accountName.toUpperCase().trim() }),
      status: data.status || AccountStatus.Pending,
      balance: data.balance || 0n,
      bookBalance: data.bookBalance || 0n,
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
