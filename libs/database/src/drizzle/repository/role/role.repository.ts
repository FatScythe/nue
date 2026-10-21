import { Inject, Injectable } from '@nestjs/common';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { uuidv7 } from 'uuidv7';

import { BaseRepository } from '@libs/database/drizzle/base.repository';
import { DATABASE_CONNECTION } from '@libs/database/drizzle/drizzle.provider';
import * as schema from '@libs/database/drizzle/schemas';
import { Roles } from '@libs/database/drizzle/schemas';
import { DBTransaction } from '@libs/database/drizzle/types';

@Injectable()
export class RoleRepository extends BaseRepository<typeof Roles> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, Roles);
  }

  async transformAndValidate(
    data: typeof Roles.$inferInsert,
  ): Promise<typeof Roles.$inferInsert> {
    const { id = '', name, tenantId } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'ROLE',
      },
    };

    if (!tenantId)
      throw new Error('tenant id is required to create a new role', errOpt);

    if (!name)
      throw new Error('role name is required to create a new role', errOpt);

    return {
      ...data,
      id: id || uuidv7(),
    };
  }

  /**
   * create a new role
   */
  async create(
    data: Omit<typeof Roles.$inferInsert, 'id'>,
    tx?: DBTransaction,
  ) {
    const transformedData = await this.transformAndValidate({
      ...data,
      id: '',
    });
    const result = await this.getClient(tx)
      .insert(Roles)
      .values(transformedData)
      .returning();
    return result[0];
  }
}
