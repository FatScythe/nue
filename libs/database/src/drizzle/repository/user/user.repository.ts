import { Inject, Injectable } from '@nestjs/common';

import { eq, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';

import { BaseRepository } from '@libs/database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@libs/database/drizzle/drizzle.provider';
import * as schema from '@libs/database/drizzle/schemas';
import { Roles, Users } from '@libs/database/drizzle/schemas';
import { DBTransaction } from '@libs/database/drizzle/types';

import { UserStatus } from '../../enums';

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
    const { id = '', tenantId } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'USER',
      },
    };

    if (!tenantId)
      throw new Error('tenant id is required to create a new user', errOpt);

    return {
      ...data,
      id: id || uuidv7(),
      status: data.status || UserStatus.Pending,
      firstName: data.firstName?.toUpperCase(),
      lastName: data.lastName?.toUpperCase(),
      otherNames: data.otherNames?.toUpperCase(),
    };
  }

  async findOneWithRole(where: SQL | undefined, tx?: DBTransaction) {
    const client = tx || this.db;

    const result = await client
      .select({
        id: Users.id,
        firstName: Users.firstName,
        lastName: Users.lastName,
        middleName: Users.otherNames,
        hashedPassword: Users.hashedPassword,
        otpKey: Users.secretKey,
        emailAddress: Users.emailAddress,
        type: Users.type,
        status: Users.status,
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
  async create(
    data: Omit<typeof Users.$inferInsert, 'id'> & { id?: string },
    tx?: DBTransaction,
  ) {
    const transformedData = await this.transformAndValidate({
      ...data,
      id: data?.id || '',
    });
    const result = await this.getClient(tx)
      .insert(Users)
      .values(transformedData)
      .returning();
    return result[0];
  }
}
