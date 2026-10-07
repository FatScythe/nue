import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import type { CoreReqUser } from '@lib/common/src/types';
// ext-libs...
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, inArray, isNull, like } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';

import {
  calculatePaginationMeta,
  Calculator,
  DATE_FORMAT,
  isNumber,
} from '@common';
// libs...
import {
  AccountRepository,
  // AccountProducts,
  // AccountProductStatus,
  AccountStatus,
  AccountType,
  ChargeCalculationType,
  ChargeTime,
  CustomerRepository,
  CustomerStatus,
  DATABASE_CONNECTION,
  DBTransaction,
  GeneralLedgerRepository,
  LoanStatus,
  MoratoriumType,
} from '@database';
import * as schema from '@database/drizzle/schemas';
import {
  Accounts,
  Customers,
  GeneralLedgers,
  LoanDetails,
  SavingsDetails,
} from '@database/drizzle/schemas';

import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
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
  private readonly DP = 2;

  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly generalLedgerRepo: GeneralLedgerRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly calc: Calculator,
  ) {}

  async createSavingsAccount(dto: CreateSavingsAccountDto, user: CoreReqUser) {
    const { tenantId } = user;
    const customer = await this.customerRepo.findOne({
      where: and(
        eq(Customers.id, dto.customerId),
        eq(Customers.tenantId, tenantId!),
        eq(Customers.status, CustomerStatus.Active),
        isNull(Customers.deletedAt),
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

    const glCodes = [dto.depositGlCode, dto.feeGlCode].filter(
      Boolean,
    ) as string[];

    const glAccounts = await this.generalLedgerRepo.findAll({
      where: and(
        inArray(GeneralLedgers.code, glCodes),
        eq(GeneralLedgers.tenantId, tenantId!),
        isNull(GeneralLedgers.deletedAt),
      ),
      selectFn: (glTable) => ({
        id: glTable.id,
        code: glTable.code,
      }),
    });

    const feeGlCode = dto.feeGlCode;

    const depositGlId =
      glAccounts.find((acc) => acc.code === dto.depositGlCode)?.id ?? null;
    const feeGlId = feeGlCode
      ? (glAccounts.find((acc) => acc.code === feeGlCode)?.id ?? null)
      : null;

    if (!depositGlId)
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid deposit gl code',
        {
          error_code: 'CSA002',
        },
      );

    if (feeGlCode && !feeGlId)
      throw new ApiException(ApiErrorCode.BadRequest, 'invalid fee gl code', {
        error_code: 'CSA003',
      });

    return await this.db.transaction(async (tx) => {
      const createdAccount = await this.createAccountRecord(
        {
          accountName:
            dto.accountName ||
            `${customer.firstName} ${customer.lastName}${customer.middleName ? ' ' + customer.middleName : ''}`,
          customerId: String(customer.id),
          officeId: Number(customer.officeId),
          tenantId: user.tenantId!,
          controlGlAccountId: depositGlId,
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
        ? this.calc.toMinor(dto.targetAmount)
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
          ...(feeGlId && { feeIncomeGlAccountId: feeGlId }),
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
        eq(Accounts.id, accountId),
        eq(Accounts.tenantId, user.tenantId!),
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

    const updated = await this.accountRepo.update(eq(Accounts.id, accountId), {
      status: AccountStatus.Active,
      approvedBy: user.id,
      activationDate: dto.activationDate
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
    const { tenantId } = user;

    // validate loan processing charge details and GL requirements...
    this.validateLoanChargeDetails({
      principalAmount: dto.principalAmount,
      chargeValue: dto.chargeValue,
      chargeCalculationType: dto.chargeCalculationType,
      chargeTime: dto.chargeTime,
      feeGlCodeOrId: dto.feeGlCode,
    });

    const customer = await this.customerRepo.findOne({
      where: and(
        eq(Customers.id, dto.customerId),
        eq(Customers.tenantId, tenantId!),
        eq(Customers.status, CustomerStatus.Active),
        isNull(Customers.deletedAt),
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
        error_code: 'CLA005',
      });
    }

    // validate linked accounts if provided...
    if (dto.repaymentAccountId || dto.disbursementAccountId) {
      const linkedAccountIds = Array.from(
        new Set(
          [dto.repaymentAccountId, dto.disbursementAccountId].filter(
            Boolean,
          ) as string[],
        ),
      );

      const linkedAccounts = await this.accountRepo.findAll({
        where: and(
          inArray(schema.Accounts.id, linkedAccountIds),
          eq(schema.Accounts.tenantId, user.tenantId!),
          eq(schema.Accounts.customerId, String(customer.id)),
        ),
      });

      if (linkedAccounts.length !== linkedAccountIds.length) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'one or more linked accounts were not found or do not belong to this customer',
          { error_code: 'CLA006' },
        );
      }
    }

    const glCodes = Array.from(
      new Set(
        [dto.loanGlCode, dto.incomeGlCode, dto.feeGlCode].filter(
          Boolean,
        ) as string[],
      ),
    );

    const glAccounts = await this.generalLedgerRepo.findAll({
      where: and(
        inArray(GeneralLedgers.code, glCodes),
        eq(GeneralLedgers.tenantId, tenantId!),
        isNull(GeneralLedgers.deletedAt),
      ),
      selectFn: (glTable) => ({
        id: glTable.id,
        code: glTable.code,
      }),
    });

    const feeGlCode = dto.feeGlCode;

    const loanGlId =
      glAccounts.find((acc) => acc.code === dto.loanGlCode)?.id ?? null;
    const incomeGlId =
      glAccounts.find((acc) => acc.code === dto.incomeGlCode)?.id ?? null;
    const feeGlId = feeGlCode
      ? (glAccounts.find((acc) => acc.code === feeGlCode)?.id ?? null)
      : null;

    if (!loanGlId)
      throw new ApiException(ApiErrorCode.BadRequest, 'invalid loan gl code', {
        error_code: 'CLA007',
      });

    if (!incomeGlId)
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid income gl code',
        {
          error_code: 'CLA008',
        },
      );

    if (feeGlCode && !feeGlId)
      throw new ApiException(ApiErrorCode.BadRequest, 'invalid fee gl code', {
        error_code: 'CLA009',
      });

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
          controlGlAccountId: loanGlId,
          type: AccountType.Loan,
          accountName,
          officeId: Number(customer.officeId),
          userId: user.id,
          status: dto.activate ? AccountStatus.Active : AccountStatus.Pending,
          openingBalance: '0',
          ...(dto.createdDate && {
            createdAt: moment(dto.createdDate, DATE_FORMAT).toDate(),
          }),
        },
        tx,
      );

      const principalMinor = this.calc.toMinor(dto.principalAmount);
      const chargeValue = this.calc.toMinor(dto.chargeValue || '0');
      await this.accountRepo.createLoanDetails(
        {
          accountId: createdAccount.accountId,
          tenantId: user.tenantId!,
          disbursementAccountId: dto.disbursementAccountId || null,
          repaymentAccountId: dto.repaymentAccountId || null,
          principalAmount: principalMinor,
          outstandingBalance: principalMinor,
          tenor: dto.tenor,
          repaymentFrequency: dto.repaymentFrequency,
          interestRate: this.calc.round(dto.interestRate, this.DP),
          status: LoanStatus.Pending,
          chargeCalculationType:
            dto.chargeCalculationType || ChargeCalculationType.Fixed,
          chargeTime: dto.chargeTime || ChargeTime.Upfront,
          chargeValue,
          moratoriumType: dto.moratoriumType || MoratoriumType.None,
          moratoriumPeriod: dto.moratoriumPeriod || 0,
          incomeGlAccountId: incomeGlId,
          ...(feeGlCode && { feeIncomeGlAccountId: feeGlId }),
          repaymentStartDate: moment().endOf('month').toDate(), // TODO: this will depend on tenor and repayment freq...
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
        { error_code: 'CLA010' },
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

    const conditions = [
      eq(Accounts.tenantId, user.tenantId!),
      isNull(Accounts.deletedAt),
    ];

    if (query.customerId) {
      conditions.push(eq(Accounts.customerId, query.customerId));
    }
    if (query.type) {
      conditions.push(eq(Accounts.type, query.type));
    }
    if (query.status) {
      conditions.push(eq(Accounts.status, query.status));
    }
    if (query.search) {
      if (isNumber(query.search)) {
        conditions.push(like(Accounts.accountNumber, `%${query.search}%`));
      } else {
        conditions.push(like(Accounts.accountName, `%${query.search}%`));
      }

      // conditions.push(
      //   or(
      //     like(Accounts.accountNumber, `%${query.search}%`),
      //     like(Accounts.accountName, `%${query.search}%`),
      //   )!,
      // );
    }

    const whereClause = and(...conditions);

    // fetch total matching records count...
    const totalCount = await this.accountRepo.count(whereClause);

    // fetch paginated account records...
    const accountsList = await this.db
      .select()
      .from(Accounts)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(Accounts.createdAt));

    // convert balance to number for presentation...
    const formattedData = accountsList.map((acc) => {
      // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
      const overdraftLimit = BigInt('0');
      const availableBalance = this.calc.add(
        this.calc.subtract(acc.bookBalance, acc.lienAmount),
        overdraftLimit,
      );

      return {
        ...acc,
        availableBalance: this.calc.toMajorStr(availableBalance, this.DP),
        bookBalance: this.calc.toMajorStr(acc.bookBalance, this.DP),
      };
    });

    return plainToInstance(PaginatedAccountsRespDto, {
      data: formattedData,
      meta: calculatePaginationMeta(totalCount, page, limit),
    });
  }

  async getSingleAccount(accountId: string, user: CoreReqUser) {
    const account = await this.accountRepo.findOne({
      where: and(
        eq(Accounts.id, accountId),
        eq(Accounts.tenantId, user.tenantId!),
        isNull(Accounts.deletedAt),
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

    let accLoanDetails: LoanDetailsRespDto | null = null;
    let accSavingsDetails: SavingsDetailsRespDto | null = null;

    // Conditionally fetch loan details if account is of type 'Loan'
    if (account.type === AccountType.Loan) {
      const rawLoan = await this.db.query.LoanDetails.findFirst({
        where: and(
          eq(LoanDetails.accountId, account.id),
          eq(LoanDetails.tenantId, user.tenantId!),
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

        accLoanDetails = {
          moratoriumPeriod,
          moratoriumType,
          repaymentFrequency,
          repaymentStartDate,
          status,
          tenor,
          principalAmount: this.calc.toMajorStr(
            rawLoan.principalAmount,
            this.DP,
          ),
          outstandingBalance: this.calc.toMajorStr(
            rawLoan.outstandingBalance,
            2,
          ),
          chargeValue: this.calc.toMajorStr(rawLoan.chargeValue, this.DP),
          chargeCalculationType: rawLoan.chargeCalculationType,
          chargeTime: rawLoan.chargeTime,
          interestRate: this.calc.toMajor(rawLoan.interestRate, this.DP),
          closedAt: closedAt || undefined,
          disbursedAt: disbursedAt || undefined,
        };
      }
    }

    // Conditionally fetch savings details if account is of type 'Savings'
    if (account.type === AccountType.Savings) {
      const rawSavings = await this.db.query.SavingsDetails.findFirst({
        where: and(
          eq(SavingsDetails.accountId, account.id),
          eq(SavingsDetails.tenantId, user.tenantId!),
        ),
      });

      if (rawSavings) {
        accSavingsDetails = {
          ...rawSavings,
          targetAmount: rawSavings.targetAmount
            ? this.calc.toMajorStr(rawSavings.targetAmount, this.DP)
            : null,
          // interestRate: rawSavings.interestRate // TODO: Add this maybe?
          //   ? Number(rawSavings.interestRate)
          //   : 0,
        };
      }
    }

    // calculate available balance: (bookBalance - lienAmount) + overdraftLimit....
    const overdraftLimit = BigInt('0');
    const availableBalance = this.calc.add(
      this.calc.subtract(account.bookBalance, account.lienAmount),
      overdraftLimit,
    );

    const result = {
      ...account,
      availableBalance: this.calc.toMajorStr(availableBalance, this.DP),
      bookBalance: this.calc.toMajorStr(account.bookBalance, this.DP),
      savingsDetails: accSavingsDetails,
      loanDetails: accLoanDetails,
    };

    return plainToInstance(AccountItemRespDto, result);
  }

  /**
   * internal service layer helper to strictly handle account record creation.
   * No validations are performed here.
   */
  async createAccountRecord(
    data: {
      tenantId: number;
      customerId: string;
      controlGlAccountId: string;
      type?: AccountType;
      accountName: string;
      officeId: number;
      userId: string;
      // productId?: number;
      // productType?: AccountProducts;
      status?: AccountStatus;
      createdAt?: Date;
      externalId?: string;
      openingBalance?: string;
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

    const balance = this.calc.toMinor(data.openingBalance || 0);

    const createdAt = data.createdAt || new Date();
    // insert into db via repository layer...
    const account = await this.accountRepo.create(
      {
        tenantId: data.tenantId,
        // productId: data.productId,
        controlGlAccountId: data.controlGlAccountId,
        type: data.type || AccountType.Savings,
        customerId: data.customerId,
        accountName: data.accountName,
        accountNumber,
        officeId: data.officeId,
        lienAmount: BigInt('0'),
        postNoCredit: false,
        postNoDebit: false,
        bookBalance: balance,
        status: data.status || AccountStatus.Pending,
        approvedBy: data.userId,
        createdBy: data.userId,
        activationDate: data.status === AccountStatus.Active ? createdAt : null,
        createdAt,
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

  /**
   * Validates account existence, active status, restriction flags (PND/PNC),
   * and available balance prior to executing posting operations.
   *
   * @param options.account - The customer or internal account entity to validate
   * @param options.amount - The posting transaction amount in minor units
   * @param options.entryType - The accounting direction ('debit' or 'credit')
   * @param options.overdraftLimit - Approved overdraft limit in minor units (defaults to 0n)
   *
   * @throws {ApiException} ACC001 - Account is null or undefined
   * @throws {ApiException} ACC002 - Account status is not Active
   * @throws {ApiException} ACC003 - Credit transaction requested on Post No Credit (PNC) account
   * @throws {ApiException} ACC004 - Debit transaction requested on Post No Debit (PND) account
   * @throws {ApiException} ACC005 - Insufficient available balance (bookBalance - lienAmount + overdraftLimit)
   */
  assertPostingAllowed({
    account,
    amount,
    entryType,
    overdraftLimit = 0n,
  }: {
    account?: Pick<
      typeof Accounts.$inferSelect,
      | 'status'
      | 'postNoCredit'
      | 'postNoDebit'
      | 'restrictionReason'
      | 'bookBalance'
      | 'lienAmount'
    >;
    amount: string | bigint; // minor units
    entryType: 'debit' | 'credit';
    overdraftLimit?: string | bigint; // optional overdraft limit in minor units
  }) {
    if (!account) {
      throw new ApiException(ApiErrorCode.InvalidAccount, 'invalid account', {
        error_code: 'ACC001',
      });
    }

    // check account active status...
    if (account.status !== AccountStatus.Active) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `account is not active. current status: ${account.status}`,
        { error_code: 'ACC002' },
      );
    }

    // check post no credit (pnc) restriction...
    if (entryType === 'credit' && account.postNoCredit) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `account is restricted for credit transactions (PNC). reason: ${
          account.restrictionReason || 'none specified'
        }`,
        { error_code: 'ACC003' },
      );
    }

    // check post no debit (pnd) restriction...
    if (entryType === 'debit' && account.postNoDebit) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        `account is restricted for debit transactions (PND). reason: ${
          account.restrictionReason || 'none specified'
        }`,
        { error_code: 'ACC004' },
      );
    }

    // validate available balance for debits: available = (bookBalance - lienAmount) + overdraftLimit...
    if (entryType === 'debit') {
      const availableBalance = this.calc.add(
        this.calc.subtract(account.bookBalance, account.lienAmount),
        overdraftLimit,
      );

      if (this.calc.isLessThan(availableBalance, amount)) {
        throw new ApiException(
          ApiErrorCode.InsufficientFunds,
          'insufficient available funds taking into consideration active liens and overdraft limits',
          { error_code: 'ACC005' },
        );
      }
    }
  }

  private async generateAccountNumber(
    tenantId: number,
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
        .from(Accounts)
        .where(
          and(eq(Accounts.tenantId, tenantId), eq(Accounts.officeId, officeId)),
        );

      const nextSequence = Number(result[0].count) + 1 + attempts;

      // format to 10 digits...
      const branchPrefix = officeId.toString().padStart(3, '0').slice(-3);
      const sequence = nextSequence.toString().padStart(7, '0').slice(-7);
      accountNumber = `${branchPrefix}${sequence}`;

      //  check if this specific account number exists...
      const existing = await tx.query.Accounts.findFirst({
        where: and(eq(Accounts.accountNumber, accountNumber)),
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

  /**
   * validates processing fee caps, calculation types, gl account requirements,
   * and net disbursement thresholds across loan creation and details updates
   */
  validateLoanChargeDetails({
    principalAmount,
    chargeValue,
    chargeCalculationType,
    chargeTime,
    feeGlCodeOrId,
  }: {
    principalAmount: string;
    chargeValue?: string;
    chargeCalculationType?: ChargeCalculationType;
    chargeTime?: ChargeTime;
    feeGlCodeOrId?: string | null;
  }) {
    // skip validation if no charge value is provided or charge is 0
    if (!chargeValue || !this.calc.isGreaterThan(chargeValue, '0')) {
      return;
    }

    const chargeType = chargeCalculationType ?? ChargeCalculationType.Fixed;
    const time = chargeTime ?? ChargeTime.Upfront;

    // require feeGlCode or existing feeIncomeGlAccountId whenever a non-zero charge is configured...
    if (!feeGlCodeOrId) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'feeGlCode is required when a processing charge is specified',
        { error_code: 'VLC000' },
      );
    }

    // compute the evaluated fee amount in major currency units based on calculation type...
    let evaluatedFeeAmount: string;

    if (chargeType === ChargeCalculationType.Percentage) {
      // validate percentage rate bounds (0% to 100%)
      if (!this.calc.isWithinRange(chargeValue, '0', '100')) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'charge percentage rate must be between 0% and 100%',
          { error_code: 'VLC001' },
        );
      }

      // evaluatedFee = principalAmount * (chargeValue / 100)...
      const feeDecimalRate = this.calc.divide(chargeValue, '100');
      evaluatedFeeAmount = this.calc.multiply(principalAmount, feeDecimalRate);
    } else {
      // Fixed amount in major currency
      evaluatedFeeAmount = chargeValue;
    }

    // ensure total fee is strictly less than principal...
    if (this.calc.isGreaterThanOrEqual(evaluatedFeeAmount, principalAmount)) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'processing fee cannot be equal to or exceed the loan principal amount',
        { error_code: 'VLC002' },
      );
    }

    // cap fee at a maximum percentage limit (e.g., 10% of principal)...
    const MAX_FEE_PERCENTAGE = '0.1'; // 10%
    const maxAllowedFee = this.calc.multiply(
      principalAmount,
      MAX_FEE_PERCENTAGE,
    );

    if (this.calc.isGreaterThan(evaluatedFeeAmount, maxAllowedFee)) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'processing fee cannot exceed 10% of the loan principal amount',
        { error_code: 'VLC003' },
      );
    }

    // chargeTime specific guards...
    if (time === ChargeTime.Upfront) {
      // verify net disbursement amount (principal - upfront fee) remains positive
      const netDisbursement = this.calc.subtract(
        principalAmount,
        evaluatedFeeAmount,
      );

      if (this.calc.isLessThanOrEqual(netDisbursement, '0')) {
        throw new ApiException(
          ApiErrorCode.BadRequest,
          'upfront fee reduces net disbursement proceeds to zero or below',
          { error_code: 'VLC004' },
        );
      }
    }
  }

  // async createSavingsAccount(dto: CreateAccountDto, user: CoreReqUser) {
  //   const dbClient = this.db;

  //   // fetch and verify customer...
  //   const customer = await dbClient.query.Customers.findFirst({
  //     where: and(
  //       eq(Customers.id, dto.customerId),
  //       eq(Customers.tenantId, user.tenantId!),
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
