import { Inject } from '@nestjs/common';

import { sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTable } from 'drizzle-orm/pg-core';

import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import * as schema from '@database/drizzle/schemas';
import { DatabaseClient, DBTransaction } from '@database/drizzle/types';

// checks if it is drizzle col. extract the primitive type else return what was passed...
type UnwrapColumn<T> = T extends { _: { data: infer D } } ? D : T;

export type InferSelect<T> = T extends PgTable
  ? // if T is an entire table schema object (e.g. `selectFn: () => Users` | `selectFn: undefined`), return its full inferred row type...
    T['_']['inferSelect']
  : T extends Record<string, any>
    ? // if T is is a custom object ...
      {
        // we loop 2ru each key and check if it is drizzle column...
        [K in keyof T]: T[K] extends { _: { data: any } }
          ? UnwrapColumn<T[K]> // it is drizzle col. extract the primitive type...
          : T[K] extends PgTable // is it a entire table??...
            ? T[K]['_']['inferSelect'] // we can just $inferSelect...
            : T[K] extends Record<string, any>
              ? InferSelect<T[K]> // rerun the loop...
              : T[K]; // leave plain types...
      }
    : T;

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
    data: Omit<TTable['_']['inferInsert'], 'id'> & { id?: string },
    tx?: DBTransaction,
  ): Promise<TTable['_']['inferSelect'] | null> {
    const client = this.getClient(tx);
    const transformData = await this.transformAndValidate(data);

    const result = await client
      .insert(this.table)
      .values(transformData)
      .returning();

    return result[0] || null;
  }

  async findOne<S extends Record<string, any> = never>(
    options: { where?: SQL } & (
      | { selectFn: (table: TTable) => S; joinFn: (query: any) => any }
      | { selectFn?: (table: TTable) => S }
    ),
    tx?: DBTransaction,
  ): Promise<
    ([S] extends [never] ? TTable['_']['inferSelect'] : InferSelect<S>) | null
  > {
    const client = this.getClient(tx);
    const { where, selectFn } = options;

    let query = selectFn
      ? client.select(selectFn(this.table) as any).from(this.table as any)
      : client.select().from(this.table as any);

    if ('joinFn' in options) {
      query = options.joinFn(query);
    }

    const results = await query.where(where).limit(1);

    if (!results || (Array.isArray(results) && results.length === 0)) {
      return null;
    }

    return results[0] as any;
  }

  async findAll<S extends Record<string, any> = never>(
    options: {
      where?: SQL;
      limit?: number;
      offset?: number;
      joinFn?: (query: any) => any;
    } & ({ selectFn: (table: TTable) => S } | { selectFn?: undefined }),
    tx?: DBTransaction,
  ): Promise<
    ([S] extends [never] ? TTable['_']['inferSelect'] : InferSelect<S>)[]
  > {
    const client = this.getClient(tx);
    const { where, selectFn, limit, offset, joinFn } = options;

    let query: any = selectFn
      ? client.select(selectFn(this.table) as any).from(this.table as any)
      : client.select().from(this.table as any);

    if (joinFn) query = joinFn(query);

    if (where) query = query.where(where);

    if (typeof limit === 'number') query = query.limit(limit);

    if (typeof offset === 'number') query = query.offset(offset);

    const results = await query;
    return results as any;
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

  async count(where?: SQL, tx?: DBTransaction): Promise<number> {
    const client = this.getClient(tx);

    const result = await client
      .select({ count: sql`count(*)` })
      .from(this.table as any)
      .where(where);

    return Number(result[0]?.count ?? 0);
  }

  async exists(where: SQL | undefined, tx?: DBTransaction): Promise<boolean> {
    const client = this.getClient(tx);

    const result = await client
      .select({ dummy: sql`1` })
      .from(this.table as any)
      .where(where)
      .limit(1);

    return result.length > 0;
  }

  protected getClient(tx?: DBTransaction): DatabaseClient {
    // If 'tx' exists, we use it (ensuring ACID compliance)
    // otherwise, we use the main pool...
    return tx || this.db;
  }
}
