import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { eq, SQL } from 'drizzle-orm';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { roles, users } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/database.provider';
import { DBTransaction } from '@database/types';

@Injectable()
export class UserRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db);
  }

  async findOneWithRole(where: SQL | undefined, tx?: DBTransaction) {
    const client = tx || this.db;

    const result = await client
      .select({
        id: users.id,
        emailAddress: users.emailAddress,
        secretKey: users.secretKey,
        whitelistedIps: users.ipWhitelist,
        type: users.type,
        role: {
          id: roles.id,
          name: roles.name,
          permissions: roles.permissions,
        },
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
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
