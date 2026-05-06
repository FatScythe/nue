import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateSavingsAccountDto, CreateSavingsAcctRespDto } from './dto';
import { DBTransaction } from '@database/types';
import { AccountRepository } from '@database/repository';
import {
  AccountProducts,
  AccountProductStatus,
  AccountStatus,
  CustomerStatus,
  CustomerType,
} from '@database/enums';
import moment from 'moment';
import type { CoreReqUser } from '@lib/common/src/types';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import * as schema from '@database/schemas';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, eq } from 'drizzle-orm';
import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import { plainToInstance } from 'class-transformer';
import { Calculator } from '@common';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepo: AccountRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calculator: Calculator,
  ) {}

  async createSavingsAccount(dto: CreateSavingsAccountDto, user: CoreReqUser) {
    const dbClient = this.db;

    // fetch and verify customer...
    const customer = await dbClient.query.customers.findFirst({
      where: and(
        eq(schema.customers.id, dto.customerId),
        eq(schema.customers.tenantId, user.tenantId!),
      ),
      columns: {
        status: true,
        officeId: true,
        firstName: true,
        lastName: true,
        businessName: true,
        type: true,
      },
    });

    if (!customer) {
      throw new ApiException(ApiErrorCode.BadRequest, 'customer not found', {
        error_code: 'CSA001',
      });
    }

    if (customer.status !== CustomerStatus.Active) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'customer is not active',
        {
          error_code: 'CSA002',
        },
      );
    }

    // verify account product...
    const product = await dbClient.query.accountProducts.findFirst({
      where: and(
        eq(schema.accountProducts.id, dto.productId),
        eq(schema.accountProducts.tenantId, user.tenantId!),
      ),
      columns: { status: true },
    });

    if (!product || product.status !== AccountProductStatus.Active) {
      throw new ApiException(ApiErrorCode.BadRequest, 'product unavailable', {
        error_code: 'CSA003',
      });
    }

    // resolve effective data...
    const effectiveOfficeId = customer.officeId;
    const effectiveAccountName =
      dto.accountName ||
      (customer.type === CustomerType.Individual
        ? `${customer.firstName} ${customer.lastName}`.trim()
        : customer.businessName!);

    //  create the record...
    const result = await this.createAccountRecord({
      tenantId: user.tenantId!,
      customerId: dto.customerId,
      productId: dto.productId,
      accountName: effectiveAccountName,
      officeId: effectiveOfficeId,
      userId: user.id,
      productType: AccountProducts.Savings,
      status: dto.activate ? AccountStatus.Active : AccountStatus.Pending,
      createdAt: dto.createdDate ? moment(dto.createdDate).toDate() : undefined,
      openingBalance: dto.openingBalance,
    });

    return plainToInstance(CreateSavingsAcctRespDto, {
      savingsId: result.accountId,
      accountNumber: result.accountNumber,
    });
  }

  /**
   * internal service layer helper to strictly handle account record creation.
   * No validations are performed here.
   */
  async createAccountRecord(
    data: {
      tenantId: string;
      customerId: string;
      productId: number;
      accountName: string;
      officeId: number;
      userId: string;
      productType: AccountProducts;
      status?: AccountStatus;
      createdAt?: Date;
      externalId?: string;
      openingBalance?: number;
    },
    tx?: DBTransaction,
  ) {
    const dbClient = (tx || this.db) as typeof this.db;

    // generate the deterministic account number...
    const accountNumber = await this.generateAccountNumber(
      data.tenantId,
      data.officeId,
      dbClient,
    );

    const balance = this.calculator.toMinor(data.openingBalance || 0);

    // insert into db via repository layer...
    const account = await this.accountRepo.create(
      {
        id: '', // repo generates uuidv7
        tenantId: data.tenantId,
        productId: data.productId,
        customerId: data.customerId,
        accountName: data.accountName,
        accountNumber,
        officeId: data.officeId,
        balance,
        bookBalance: balance,
        status: data.status || AccountStatus.Pending,
        approvedBy: data.userId,
        createdBy: data.userId,
        createdAt: data.createdAt || new Date(),
        reference: data.externalId || null,
      },
      tx,
    );

    if (!account) {
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'CAR001: Failed to create account record',
        { error_code: 'CAR001' },
      );
    }

    return { accountId: account.id, accountNumber: account.accountNumber };
  }

  private async generateAccountNumber(
    tenantId: string,
    officeId: number,
    tx: NodePgDatabase<typeof schema>,
  ): Promise<string> {
    let attempts = 0;
    let accountNumber = '';
    let isUnique = false;

    while (attempts < 3 && !isUnique) {
      // get count (current count + attempts to offset if a collision is found)...
      const result = await tx
        .select({ count: count() })
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.tenantId, tenantId),
            eq(schema.accounts.officeId, officeId),
          ),
        );

      const nextSequence = Number(result[0].count) + 1 + attempts;

      // format to 10 digits...
      const branchPrefix = officeId.toString().padStart(3, '0').slice(-3);
      const sequence = nextSequence.toString().padStart(7, '0').slice(-7);
      accountNumber = `${branchPrefix}${sequence}`;

      //  check if this specific account number exists...
      const existing = await tx.query.accounts.findFirst({
        where: and(eq(schema.accounts.accountNumber, accountNumber)),
        columns: { id: true },
      });

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new ApiException(
        ApiErrorCode.Conflict,
        'could not generate a unique account number',
        { error_code: 'GAN001' },
        HttpStatus.CONFLICT,
      );
    }

    return accountNumber;
  }
}
