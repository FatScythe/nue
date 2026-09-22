import { Inject, Injectable } from '@nestjs/common';

import { eq, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { BaseRepository } from '@database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import * as schema from '@database/drizzle/schemas';
import { Roles, Users } from '@database/drizzle/schemas';
import { DBTransaction } from '@database/drizzle/types';

@Injectable()
export class UserRepository extends BaseRepository<typeof Users> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, Users);
  }

  async transformAndValidate(
    data: typeof Users.$inferInsert,
  ): Promise<typeof Users.$inferInsert> {
    return data;
  }

  async findOneWithRole(where: SQL | undefined, tx?: DBTransaction) {
    const client = tx || this.db;

    const result = await client
      .select({
        id: Users.id,
        emailAddress: Users.emailAddress,
        type: Users.type,
        role: {
          id: Roles.id,
          name: Roles.name,
          permissions: Roles.permissions,
        },
        tenantId: Users.tenantId,
      })
      .from(Users)
      .innerJoin(Roles, eq(Users.roleId, Roles.id))
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
        id: Users.id,
        secretKey: Users.secretKey,
        whitelistedIps: Users.ipWhitelist,
        type: Users.type,
        scopes: Users.scopes,
        tenantId: Users.tenantId,
      })
      .from(Users)
      .where(where)
      .limit(1);

    return result[0] || null;
  }

  /**
   * create a new user
   */
  async create(data: typeof Users.$inferInsert, tx?: DBTransaction) {
    const result = await this.getClient(tx)
      .insert(Users)
      .values(data)
      .returning();
    return result[0];
  }
}
