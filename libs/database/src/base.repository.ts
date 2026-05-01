import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { DatabaseClient, DBTransaction } from '@database/types';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQL } from 'drizzle-orm';

export abstract class BaseRepository<TTable extends PgTable> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
    protected readonly table: TTable,
  ) {}

  abstract transformAndValidate(
    data: TTable['_']['inferInsert'],
  ): Promise<TTable['_']['inferInsert']>;

  async create(
    data: TTable['_']['inferInsert'],
    tx?: DBTransaction,
  ): Promise<TTable['_']['inferSelect']> {
    const client = this.getClient(tx);
    const transformData = await this.transformAndValidate(data);

    const result = await client.insert(this.table).values(transformData);

    return result[0] || null;
  }

  async findOne<T extends Record<string, any>>(
    {
      where,
      selectFn,
      joinFn,
    }: {
      where: SQL | undefined;
      selectFn: (table: TTable) => T;
      joinFn?: (query: any) => any;
    },
    tx?: DBTransaction,
  ): Promise<T | null> {
    const client = this.getClient(tx);
    let query = client.select(selectFn(this.table)).from(this.table as any);

    if (joinFn) {
      query = joinFn(query);
    }

    const results = await query.where(where).limit(1);

    if (!results || (Array.isArray(results) && results.length === 0))
      return null;

    return results[0] as T;
  }

  async findAll<T extends Record<string, any>>(
    {
      where,
      selectFn,
      joinFn,
      limit,
      offset,
    }: {
      where?: SQL;
      selectFn: (table: TTable) => T;
      joinFn?: (query: any) => any;
      limit?: number;
      offset?: number;
    },
    tx?: DBTransaction,
  ): Promise<T[]> {
    const client = this.getClient(tx);
    let query: any = client
      .select(selectFn(this.table))
      .from(this.table as any);

    if (joinFn) query = joinFn(query);

    if (where) query = query.where(where);

    if (typeof limit === 'number') {
      query = query.limit(limit);
    }

    if (typeof offset === 'number') {
      query = query.offset(offset);
    }

    return await query;
  }

  async update<T extends Record<string, any> = TTable['_']['inferSelect']>(
    where: SQL,
    data: Partial<TTable['_']['inferInsert']>,
    tx?: DBTransaction,
  ): Promise<T | null> {
    const client = this.getClient(tx);

    const results = await client
      .update(this.table as any)
      .set({
        ...data,
        updatedAt: new Date(), // TODO: Triggers
      })
      .where(where)
      .returning();

    if (!results || results.length === 0) {
      return null;
    }

    return results[0] as T;
  }

  async delete(where: SQL, tx?: DBTransaction) {
    const client = this.getClient(tx);
    const [result] = await client.delete(this.table).where(where).returning();
    return result;
  }

  protected getClient(tx?: DBTransaction): DatabaseClient {
    // If 'tx' exists, we use it (ensuring ACID compliance)
    // otherwise, we use the main pool...
    return tx || this.db;
  }
}
