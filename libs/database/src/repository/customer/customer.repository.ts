import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@database/schemas';
import { BaseRepository } from '@database/base.repository';
import { customers } from '@database/schemas';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { CustomerStatus, CustomerType } from '@database/enums';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class CustomerRepository extends BaseRepository<typeof customers> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, customers);
  }

  async transformAndValidate(
    data: typeof customers.$inferInsert,
  ): Promise<typeof customers.$inferInsert> {
    const {
      type,
      firstName,
      lastName,
      dateOfBirth,
      businessName,
      dateOfIncorporation,
      emailAddress,
    } = data;

    const errOpt = {
      cause: {
        code: 'VALIDATION_FAILED',
        layer: 'REPOSITORY',
        module: 'CUSTOMER',
      },
    };

    if (!emailAddress) throw new Error('email address is required', errOpt);
    if (!data.tenantId)
      throw new Error(
        'tenant id is required to open create a customer',
        errOpt,
      );
    if (!data.createdBy) throw new Error('creator user id is required', errOpt);

    if (type === CustomerType.Individual) {
      if (!firstName || !lastName) {
        throw new Error(
          'first name and last name is required for individual customers',
          errOpt,
        );
      }
      if (!dateOfBirth) {
        throw new Error(
          'date of birth is required for individual customers',
          errOpt,
        );
      }
    } else if (type === CustomerType.Corporate) {
      if (!businessName) {
        throw new Error(
          'business name is required for corporate customers',
          errOpt,
        );
      }
      if (!dateOfIncorporation) {
        throw new Error(
          'date of incorporation is required for corporate customers',
          errOpt,
        );
      }
    }

    return {
      ...data,
      id: uuidv7(),
      ...(firstName && { firstName: firstName.toUpperCase().trim() }),
      ...(lastName && { lastName: lastName.toUpperCase().trim() }),
      ...(data.middleName && {
        middleName: data.middleName.toUpperCase().trim(),
      }),

      ...(businessName && { businessName: businessName.toUpperCase().trim() }),

      status: data.status || CustomerStatus.PendingVerification,
      emailAddress: emailAddress.toLowerCase().trim(),
    };
  }

  /**
   * create a new customer profile...
   */
  // override async create(
  //   data: typeof customers.$inferInsert,
  //   tx?: DBTransaction,
  // ) {
  //   const result = await this.getClient(tx)
  //     .insert(customers)
  //     .values(data)
  //     .returning();
  //   return result[0];
  // }
}
