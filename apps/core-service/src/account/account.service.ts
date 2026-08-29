import { HttpStatus, Inject, Injectable } from '@nestjs/common';

// ext-libs...
import { plainToInstance } from 'class-transformer';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, eq, like, or, desc, inArray } from 'drizzle-orm';
import moment from 'moment';

// libs...
import {
  DATABASE_CONNECTION,
  // AccountProducts,
  // AccountProductStatus,
  AccountStatus,
  AccountType,
  CustomerStatus,
  AccountRepository,
  DBTransaction,
  CustomerRepository,
  LoanStatus,
  MoratoriumType,
} from '@database';
import * as schema from '@database/drizzle/schemas';
import { customers, accounts } from '@database/drizzle/schemas';
import {
  calculatePaginationMeta,
  Calculator,
  DATE_FORMAT,
  isNumber,
} from '@common';

import type { CoreReqUser } from '@lib/common/src/types';
import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import {
  AccountItemRespDto,
  ActivateAccountDto,
  ActivateAccountRespDto,
  CreateLoanAccountDto,
  CreateLoanAcctRespDto,
  CreateSavingsAccountDto,
  CreateSavingsAcctRespDto,
  GetAccountsQueryDto,
  LoanDetailsRespDto,
  PaginatedAccountsRespDto,
} from './dto';
import { SavingsDetailsRespDto } from './dto/response/saving-detail.res.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly customerRepo: CustomerRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calculator: Calculator,
  ) {}

  async createSavingsAccount(dto: CreateSavingsAccountDto, user: CoreReqUser) {
    const customer = await this.customerRepo.findOne({
      where: and(
        eq(customers.id, dto.customerId),
        eq(customers.tenantId, user.tenantId!),
        eq(customers.status, CustomerStatus.Active),
      ),
      selectFn: (customer) => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        middleName: customer.middleName,
        officeId: customer.officeId,
      }),
    });

    if (!customer) {
      throw new ApiException(ApiErrorCode.BadRequest, 'customer not found', {
        error_code: 'CSA001',
      });
    }

    return await this.db.transaction(async (tx) => {
      const createdAccount = await this.createAccountRecord(
        {
          accountName:
            dto.accountName ||
            `${customer.firstName} ${customer.lastName}${customer.middleName ? ' ' + customer.middleName : ''}`,
          customerId: String(customer.id),
          officeId: Number(customer.officeId),
          tenantId: user.tenantId!,
          userId: user.id,
          type: AccountType.Savings,
          openingBalance: dto.openingBalance,
          status: dto.activate ? AccountStatus.Active : AccountStatus.Pending,
          ...(dto.createdDate && {
            createdAt: moment(dto.createdDate, DATE_FORMAT).toDate(),
          }),
        },
        tx,
      );

      // create savings details record...
      const targetAmountBigInt = dto.targetAmount
        ? BigInt(this.calculator.toMinor(dto.targetAmount))
        : null;

      await this.accountRepo.createSavingDetails(
        {
          accountId: createdAccount.accountId,
          tenantId: user.tenantId!,
          targetAmount: targetAmountBigInt,
          targetDate: dto.targetDate
            ? moment(dto.targetDate, DATE_FORMAT).endOf('day').toDate()
            : null,
          lockPeriodEnd: dto.lockPeriodEnd
            ? moment(dto.lockPeriodEnd, DATE_FORMAT).endOf('day').toDate()
            : null,
          withdrawalCountThisMonth: 0,
        },
        tx,
      );

      return plainToInstance(CreateSavingsAcctRespDto, {
        accountId: createdAccount.accountId,
        accountNumber: createdAccount.accountNumber,
      });
    });
  }

  async activateAccount(
    accountId: string,
    dto: ActivateAccountDto,
    user: CoreReqUser,
  ) {
    const account = await this.accountRepo.findOne({
      where: and(
        eq(schema.accounts.id, accountId),
        eq(schema.accounts.tenantId, user.tenantId!),
      ),
    });

    if (!account) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'account not found',
        { error_code: 'ACA001' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (account.status === AccountStatus.Active) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'account is already active',
        { error_code: 'ACA002' },
      );
    }

    const updated = await this.accountRepo.update(eq(accounts.id, accountId), {
      status: AccountStatus.Active,
      approvedBy: user.id,
      updatedAt: dto.activationDate // TODO: add actiavation date to table
        ? moment(dto.activationDate, DATE_FORMAT).toDate()
        : new Date(),
    });

    if (!updated) {
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'failed to activate account',
        { error_code: 'ACA003' },
      );
    }

    return plainToInstance(ActivateAccountRespDto, {
      message: 'account activated successfully',
    });
  }

  async createLoanAccount(dto: CreateLoanAccountDto, user: CoreReqUser) {
    const customer = await this.customerRepo.findOne({
      where: and(
        eq(customers.id, dto.customerId),
        eq(customers.tenantId, user.tenantId!),
        eq(customers.status, CustomerStatus.Active),
      ),
      selectFn: (customer) => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        middleName: customer.middleName,
        officeId: customer.officeId,
      }),
    });

    if (!customer) {
      throw new ApiException(ApiErrorCode.BadRequest, 'customer not found', {
        error_code: 'CLA001',
      });
    }

    // validate linked accounts if provided...
    // if (dto.repaymentAccountId || dto.disbursementAccountId) {
    //   const linkedAccountIds = Array.from(
    //     new Set(
    //       [dto.repaymentAccountId, dto.disbursementAccountId].filter(
    //         Boolean,
    //       ) as string[],
    //     ),
    //   );

    //   const linkedAccounts = await this.accountRepo.findAll({
    //     where: and(
    //       inArray(schema.accounts.id, linkedAccountIds),
    //       eq(schema.accounts.tenantId, user.tenantId!),
    //       eq(schema.accounts.customerId, String(customer.id)),
    //     ),
    //   });

    //   if (linkedAccounts.length !== linkedAccountIds.length) {
    //     throw new ApiException(
    //       ApiErrorCode.BadRequest,
    //       'one or more linked accounts were not found or do not belong to this customer',
    //       { error_code: 'CLA002' },
    //     );
    //   }
    // }

    let accountId: string | null = null,
      accountNumber: string | null = null;

    await this.db.transaction(async (tx) => {
      const accountName =
        dto.accountName ||
        `${customer.firstName} ${customer.lastName}${customer.middleName ? ' ' + customer.middleName : ''}`;

      const createdAccount = await this.createAccountRecord(
        {
          tenantId: user.tenantId!,
          customerId: String(customer.id),
          type: AccountType.Loan,
          accountName,
          officeId: Number(customer.officeId),
          userId: user.id,
          status: dto.activate ? AccountStatus.Active : AccountStatus.Pending,
          openingBalance: 0, // TODO: This should open with loan amount
          ...(dto.createdDate && {
            createdAt: moment(dto.createdDate, DATE_FORMAT).toDate(),
          }),
        },
        tx,
      );

      const principalMinor = BigInt(
        this.calculator.toMinor(dto.principalAmount),
      );
      const processingFeeMinor = BigInt(
        this.calculator.toMinor(dto.processingFee || 0),
      );

      await this.accountRepo.createLoanDetails(
        {
          accountId: createdAccount.accountId,
          tenantId: user.tenantId!,
          // disbursementAccountId: dto.disbursementAccountId || createdAccount.accountId,
          // repaymentAccountId: dto.repaymentAccountId || createdAccount.accountId,
          principalAmount: principalMinor,
          outstandingBalance: principalMinor,
          tenor: dto.tenor,
          repaymentFrequency: dto.repaymentFrequency,
          interestRate: dto.interestRate.toFixed(2),
          status: LoanStatus.Active,
          processingFee: processingFeeMinor,
          moratoriumType: dto.moratoriumType || MoratoriumType.None,
          moratoriumPeriod: dto.moratoriumPeriod || 0,
          repaymentStartDate: moment().endOf('month').toDate(),
        },
        tx,
      );

      accountId = createdAccount.accountId;
      accountNumber = createdAccount.accountNumber;
    });

    if (!accountId || !accountNumber) {
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'failed to create loan account record',
        { error_code: 'CLA003' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return plainToInstance(CreateLoanAcctRespDto, {
      accountId,
      accountNumber,
    });
  }

  async getAccounts(query: GetAccountsQueryDto, user: CoreReqUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.accounts.tenantId, user.tenantId!)];

    if (query.customerId) {
      conditions.push(eq(schema.accounts.customerId, query.customerId));
    }
    if (query.type) {
      conditions.push(eq(schema.accounts.type, query.type));
    }
    if (query.status) {
      conditions.push(eq(schema.accounts.status, query.status));
    }
    if (query.search) {
      if (isNumber(query.search)) {
        conditions.push(
          like(schema.accounts.accountNumber, `%${query.search}%`),
        );
      } else {
        conditions.push(like(schema.accounts.accountName, `%${query.search}%`));
      }

      // conditions.push(
      //   or(
      //     like(schema.accounts.accountNumber, `%${query.search}%`),
      //     like(schema.accounts.accountName, `%${query.search}%`),
      //   )!,
      // );
    }

    const whereClause = and(...conditions);

    // fetch total matching records count...
    const totalCount = await this.accountRepo.count(whereClause);

    // fetch paginated account records...
    const accountsList = await this.db
      .select()
      .from(schema.accounts)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.accounts.createdAt));

    // convert balance to number for presentation...
    const formattedData = accountsList.map((acc) => ({
      ...acc,
      balance: this.calculator.toMajor(acc.balance),
      bookBalance: this.calculator.toMajor(acc.bookBalance),
    }));

    return plainToInstance(PaginatedAccountsRespDto, {
      data: formattedData,
      meta: calculatePaginationMeta(totalCount, page, limit),
    });
  }

  async getSingleAccount(accountId: string, user: CoreReqUser) {
    const account = await this.accountRepo.findOne({
      where: and(
        eq(schema.accounts.id, accountId),
        eq(schema.accounts.tenantId, user.tenantId!),
      ),
    });

    if (!account) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'account not found',
        { error_code: 'ANF001' },
        HttpStatus.NOT_FOUND,
      );
    }

    let loanDetails: LoanDetailsRespDto | null = null;
    let savingsDetails: SavingsDetailsRespDto | null = null;

    // conditionally fetch loan details if account is of type 'Loan'...
    if (account.type === AccountType.Loan) {
      const rawLoan = await this.db.query.loanDetails.findFirst({
        where: and(
          eq(schema.loanDetails.accountId, account.id),
          eq(schema.loanDetails.tenantId, user.tenantId!),
        ),
      });

      if (rawLoan) {
        const {
          moratoriumPeriod,
          moratoriumType,
          repaymentFrequency,
          repaymentStartDate,
          status,
          tenor,
          closedAt,
          disbursedAt,
        } = rawLoan;

        loanDetails = {
          moratoriumPeriod,
          moratoriumType,
          repaymentFrequency,
          repaymentStartDate,
          status,
          tenor,
          principalAmount: this.calculator.toNumber(rawLoan.principalAmount),
          outstandingBalance: this.calculator.toNumber(
            rawLoan.outstandingBalance,
          ),
          processingFee: this.calculator.toNumber(rawLoan.processingFee),
          interestRate: Number(rawLoan.interestRate),
          closedAt: closedAt || undefined,
          disbursedAt: disbursedAt || undefined,
        };
      }
    }

    // conditionally fetch savings details if account is of type 'Savings'...
    if (account.type === AccountType.Savings) {
      const rawSavings = await this.db.query.savingsDetails.findFirst({
        where: and(
          eq(schema.savingsDetails.accountId, account.id),
          eq(schema.savingsDetails.tenantId, user.tenantId!),
        ),
      });

      if (rawSavings) {
        savingsDetails = {
          ...rawSavings,
          targetAmount: rawSavings.targetAmount
            ? this.calculator.toNumber(rawSavings.targetAmount)
            : null,
          // interestRate: rawSavings.interestRate // TODO: Add this maybe?
          //   ? Number(rawSavings.interestRate)
          //   : 0,
        };
      }
    }

    const result = {
      ...account,
      balance: this.calculator.toMajor(account.balance),
      bookBalance: this.calculator.toMajor(account.bookBalance),
      savingsDetails,
      loanDetails,
    };

    return plainToInstance(AccountItemRespDto, result);
  }

  /**
   * internal service layer helper to strictly handle account record creation.
   * No validations are performed here.
   */
  async createAccountRecord(
    data: {
      tenantId: string;
      customerId: string;
      type?: AccountType;
      accountName: string;
      officeId: number;
      userId: string;
      // productId?: number;
      // productType?: AccountProducts;
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
        tenantId: data.tenantId,
        // productId: data.productId,
        type: data.type || AccountType.Savings,
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

  // async createSavingsAccount(dto: CreateAccountDto, user: CoreReqUser) {
  //   const dbClient = this.db;

  //   // fetch and verify customer...
  //   const customer = await dbClient.query.customers.findFirst({
  //     where: and(
  //       eq(schema.customers.id, dto.customerId),
  //       eq(schema.customers.tenantId, user.tenantId!),
  //     ),
  //     columns: {
  //       status: true,
  //       officeId: true,
  //       firstName: true,
  //       lastName: true,
  //       businessName: true,
  //       type: true,
  //     },
  //   });

  //   if (!customer) {
  //     throw new ApiException(ApiErrorCode.BadRequest, 'customer not found', {
  //       error_code: 'CSA001',
  //     });
  //   }

  //   if (customer.status !== CustomerStatus.Active) {
  //     throw new ApiException(
  //       ApiErrorCode.BadRequest,
  //       'customer is not active',
  //       {
  //         error_code: 'CSA002',
  //       },
  //     );
  //   }

  //   /*
  //   // verify account product...
  //   const product = await dbClient.query.accountProducts.findFirst({
  //     where: and(
  //       eq(schema.accountProducts.id, dto.productId),
  //       eq(schema.accountProducts.tenantId, user.tenantId!),
  //     ),
  //     columns: { status: true },
  //   });

  //   if (!product || product.status !== AccountProductStatus.Active) {
  //     throw new ApiException(ApiErrorCode.BadRequest, 'product unavailable', {
  //       error_code: 'CSA003',
  //     });
  //   }
  //   */

  //   // resolve effective data...
  //   const effectiveOfficeId = customer.officeId;
  //   const effectiveAccountName =
  //     dto.accountName ||
  //     (customer.type === CustomerType.Individual
  //       ? `${customer.firstName} ${customer.lastName}`.trim()
  //       : customer.businessName!);

  //   //  create the record...
  //   const result = await this.createAccountRecord({
  //     tenantId: user.tenantId!,
  //     customerId: dto.customerId,
  //     // productId: dto.productId, // Product feature temporarily bypassed
  //     type: AccountType.Savings,
  //     accountName: effectiveAccountName,
  //     officeId: effectiveOfficeId,
  //     userId: user.id,
  //     // productType: AccountProducts.Savings,
  //     status: dto.activate ? AccountStatus.Active : AccountStatus.Pending,
  //     createdAt: dto.createdDate ? moment(dto.createdDate).toDate() : undefined,
  //     openingBalance: dto.openingBalance,
  //   });

  //   return plainToInstance(CreateSavingsAcctRespDto, {
  //     savingsId: result.accountId,
  //     accountNumber: result.accountNumber,
  //   });
  // }
}
