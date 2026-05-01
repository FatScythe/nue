import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { eq, SQL } from 'drizzle-orm';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { roles, users } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { DBTransaction } from '@database/types';

@Injectable()
export class UserRepository extends BaseRepository<typeof users> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, users);
  }

  async transformAndValidate(
    data: typeof users.$inferInsert,
  ): Promise<typeof users.$inferInsert> {
    return data;
  }

  async findOneWithRole(where: SQL | undefined, tx?: DBTransaction) {
    const client = tx || this.db;

    const result = await client
      .select({
        id: users.id,
        emailAddress: users.emailAddress,
        type: users.type,
        role: {
          id: roles.id,
          name: roles.name,
          permissions: roles.permissions,
        },
        tenantId: users.tenantId,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(where)
      .limit(1);

    return result[0] || null;
  }

  async findOneWithScope(
    where: SQL | undefined,

    tx?: DBTransaction,
  ) {
    const client = tx || this.db;

    const result = await client
      .select({
        id: users.id,
        secretKey: users.secretKey,
        whitelistedIps: users.ipWhitelist,
        type: users.type,
        scopes: users.scopes,
        tenantId: users.tenantId,
      })
      .from(users)
      .where(where)
      .limit(1);

    return result[0] || null;
  }

  /**
   * create a new user
   */
  async create(data: typeof users.$inferInsert, tx?: DBTransaction) {
    const result = await this.getClient(tx)
      .insert(users)
      .values(data)
      .returning();
    return result[0];
  }
}
