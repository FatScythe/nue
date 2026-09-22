import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, eq, ilike, inArray, isNull, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';

import {
  calculatePaginationMeta,
  Calculator,
  CoreReqUser,
  DATE_FORMAT,
} from '@common';
import {
  // AccountProducts,
  // AccountProductStatus,
  AccountStatus,
  AccountType,
  CustomerGender,
  CustomerRepository,
  CustomerStatus,
  CustomerType,
  GeneralLedgerRepository,
  GeneralLedgers,
} from '@database';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import * as schema from '@database/drizzle/schemas';
import {
  Accounts,
  Customers,
  Offices,
  SavingsDetails,
  Users,
} from '@database/drizzle/schemas';

import { AccountService } from '../account/account.service';
import { ApiErrorCode } from '../common/enums';
import { ApiException } from '../common/exception';
import {
  AccountResponseDto,
  CreateCustomerDto,
  CreateCustomerRespDto,
  GetCustomersQueryDto,
  GetCustomerWithAccountsResponseDto,
  GetSingleCustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly customerRepo: CustomerRepository,
    private readonly generalLedgerRepo: GeneralLedgerRepository,
    private readonly accountService: AccountService,
    private readonly calculator: Calculator,
  ) {}

  async createCustomer(
    dto: CreateCustomerDto,
    user: CoreReqUser,
  ): Promise<CreateCustomerRespDto> {
    const dbClient = this.db;

    const officeCheck = dbClient.query.Offices.findFirst({
      where: and(
        eq(Offices.id, dto.officeId),
        eq(Offices.tenantId, user.tenantId!),
      ),
      columns: { id: true },
    });

    /*
    const productCheck = dto.createSavingsAccount
      ? dbClient.query.accountProducts.findFirst({
          where: and(
            eq(schema.accountProducts.id, dto.productId),
            eq(schema.accountProducts.tenantId, user.tenantId!),
          ),
          columns: { id: true, status: true },
        })
      : Promise.resolve(true);
    */

    // we check if the office belongs to the tenant...
    const office = await officeCheck;
    // const [office, product] = await Promise.all([officeCheck, productCheck]);

    if (!office) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid office identifier',
        { error_code: 'CC0001' },
      );
    }

    /*
    if (!product) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid account product',
        { error_code: 'CC0002' },
      );
    }

    // product might be inactive/deprecated...
    if (
      typeof product !== 'boolean' &&
      product?.status !== AccountProductStatus.Active
    )
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'account product is not active',
        { error_code: 'CC0003' },
      );
    */

    const customerExist = await this.customerRepo.exists(
      and(
        eq(Customers.emailAddress, dto.emailAddress),
        eq(Customers.tenantId, user.tenantId!),
      ),
    );

    if (customerExist)
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'customer with email already exist',
        { error_code: 'CC0004' },
      );

    let customerId: string | null = null;
    let savingsId: string | null = null;

    /*
     * the req. might need us to create a savings account
     * w/ the customer creation, so we follow the all or nothing strategy (atomicity)
     */

    await dbClient.transaction(async (tx) => {
      // create customer...
      const customer = await this.customerRepo.create(
        {
          tenantId: user.tenantId!,
          officeId: dto.officeId,
          createdBy: user.id,
          emailAddress: dto.emailAddress,
          phoneNumber: dto.phoneNumber,
          street: dto.street,
          state: dto.state,
          city: dto.city,
          country: dto.country,
          type: dto.type,
          tier: dto.tierLevel,
          ...(dto.externalId && { externalId: dto.externalId }),
          ...(dto.activateCustomer && { status: CustomerStatus.Active }),
          ...(dto.createdDate && {
            createdAt: moment(dto.createdDate).toDate(),
          }),

          ...(dto.type === CustomerType.Individual && {
            firstName: dto.firstName,
            lastName: dto.lastName,
            middleName: dto.middleName || null,
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth,
          }),
          ...(dto.type === CustomerType.Corporate && {
            businessName: dto.businessName,
            dateOfIncorporation: dto.dateOfIncorporation,
            gender: CustomerGender.Nil,
          }),
        },
        tx,
      );

      if (!customer)
        throw new ApiException(
          ApiErrorCode.InternalServerError,
          'unable to create customer',
          { error_code: 'CC0005' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

      customerId = customer.id;

      if (dto.createSavingsAccount) {
        const feeGlCode = dto.feeGlCode;
        const depositGlCode = dto.depositGlCode;

        if (!depositGlCode)
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'please provide deposit gl code',
            {
              error_code: 'CC0006',
            },
          );

        const glCodes = Array.from(
          new Set([depositGlCode, feeGlCode].filter(Boolean) as string[]),
        );

        const glAccounts = await this.generalLedgerRepo.findAll({
          where: and(
            inArray(GeneralLedgers.code, glCodes),
            eq(GeneralLedgers.tenantId, user.tenantId!),
            isNull(GeneralLedgers.deletedAt),
          ),
          selectFn: (glTable) => ({
            id: glTable.id,
            code: glTable.code,
          }),
        });

        const depositGlId =
          glAccounts.find((acc) => acc.code === depositGlCode)?.id ?? null;
        const feeGlId = feeGlCode
          ? (glAccounts.find((acc) => acc.code === feeGlCode)?.id ?? null)
          : null;

        if (!depositGlId)
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'invalid deposit gl code',
            {
              error_code: 'CC0007',
            },
          );

        if (feeGlCode && !feeGlId)
          throw new ApiException(
            ApiErrorCode.BadRequest,
            'invalid fee gl code',
            {
              error_code: 'CC0008',
            },
          );

        const effectiveAccountName =
          customer.type === CustomerType.Individual
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : customer.businessName!;

        // create account using enum type...
        const accountResult = await this.accountService.createAccountRecord(
          {
            customerId: customer.id,
            // productId: dto.productId, // Product feature temporarily bypassed
            type: AccountType.Savings,
            controlGlAccountId: depositGlId,
            accountName: effectiveAccountName,
            openingBalance: '0', // TODO: Opening balance gl transaction...
            officeId: dto.officeId,
            userId: user.id,
            tenantId: user.tenantId!,
            ...(dto.createdDate && {
              createdAt: moment(dto.createdDate).toDate(),
            }),
            ...(dto.activateCustomer && { status: AccountStatus.Active }),
          },
          tx, // pass db transaction...
        );

        await tx.insert(SavingsDetails).values({
          accountId: accountResult.accountId,
          tenantId: user.tenantId!,
          withdrawalCountThisMonth: 0,
          ...(feeGlId && { feeIncomeGlAccountId: feeGlId }),
          targetAmount: null,
          targetDate: null,
          lockPeriodEnd: null,
        });

        savingsId = accountResult.accountId;
      }
    });

    if (!customerId)
      throw new ApiException(
        ApiErrorCode.InternalServerError,
        'unable to create customer',
        { error_code: 'CC0009' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return plainToInstance(CreateCustomerRespDto, {
      customerId,
      ...(savingsId ? { savingsId } : {}),
    });
  }

  async getCustomers(dto: GetCustomersQueryDto, user: CoreReqUser) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const offset = (page - 1) * limit;

    const conditions: (SQL | undefined)[] = [
      eq(Customers.tenantId, user.tenantId!),
      isNull(Customers.deletedAt),
    ];

    if (dto.type) {
      conditions.push(eq(Customers.type, dto.type));
    }

    if (dto.status) {
      conditions.push(eq(Customers.status, dto.status));
    }

    if (dto.search) {
      const searchPattern = `%${dto.search}%`;
      conditions.push(
        or(
          ilike(Customers.emailAddress, searchPattern),
          ilike(Customers.firstName, searchPattern),
          ilike(Customers.lastName, searchPattern),
          ilike(Customers.businessName, searchPattern),
          ilike(Customers.phoneNumber, searchPattern),
        ),
      );
    }

    const whereClause = and(...conditions);

    const customerRecords = await this.customerRepo.findAll({
      where: whereClause,
      limit,
      offset,
    });

    const totalCount = await this.customerRepo.count(whereClause);

    const formattedCustomers = customerRecords.map((customer) => ({
      ...customer,
      firstName: customer.firstName ?? undefined,
      lastName: customer.lastName ?? undefined,
      businessName: customer.businessName ?? undefined,
      dateOfBirth: customer.dateOfBirth
        ? moment(customer.dateOfBirth).format(DATE_FORMAT)
        : undefined,
      dateOfIncorporation: customer.dateOfIncorporation
        ? moment(customer.dateOfIncorporation).format(DATE_FORMAT)
        : undefined,
    }));

    const meta = calculatePaginationMeta(totalCount, page, limit);

    return plainToInstance(PaginatedCustomersResponseDto, {
      data: formattedCustomers,
      meta,
    });
  }

  async getCustomerWithAccounts(customerId: string, user: CoreReqUser) {
    const rows = await this.customerRepo.findAll({
      where: and(
        eq(Customers.id, customerId),
        eq(Customers.tenantId, user.tenantId!),
        isNull(Customers.deletedAt),
      ),
      selectFn: (table) => ({
        customer: {
          id: table.id,
          emailAddress: table.emailAddress,
          firstName: table.firstName,
          lastName: table.lastName,
          status: table.status,
          dateOfBirth: table.dateOfBirth,
          phoneNumber: table.phoneNumber,
          gender: table.gender,
          type: table.type,
          businessName: table.businessName,
          dateOfIncorporation: table.dateOfIncorporation,
          street: table.street,
          state: table.state,
          city: table.city,
          country: table.country,
        },
        account: {
          id: Accounts.id,
          accountNumber: Accounts.accountNumber,
          accountName: Accounts.accountName,
          status: Accounts.status,
          type: Accounts.type,
          bookBalance: Accounts.bookBalance,
          balance: Accounts.balance,
        },
      }),
      joinFn: (query) =>
        query.leftJoin(
          Accounts,
          and(
            eq(Customers.id, Accounts.customerId),
            isNull(Accounts.deletedAt),
          ),
        ),
    });

    if (!rows || rows.length === 0) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid customer',
        { error_code: 'GCA001' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = rows.reduce<GetCustomerWithAccountsResponseDto | null>(
      (acc, row) => {
        const formattedDateOfBirth = row.customer.dateOfBirth
          ? moment(row.customer.dateOfBirth).format(DATE_FORMAT)
          : undefined;

        const formattedDateOfIncorporation = row.customer.dateOfIncorporation
          ? moment(row.customer.dateOfIncorporation).format(DATE_FORMAT)
          : undefined;

        const account = row.account?.id
          ? ({
              ...row.account,
              balance: this.calculator.toNumber(row.account.balance),
              bookBalance: this.calculator.toNumber(row.account.bookBalance),
            } as AccountResponseDto)
          : null;

        if (!acc) {
          return {
            ...row.customer,
            firstName: row.customer.firstName ?? undefined,
            lastName: row.customer.lastName ?? undefined,
            businessName: row.customer.businessName ?? undefined,
            dateOfBirth: formattedDateOfBirth,
            dateOfIncorporation: formattedDateOfIncorporation,
            accounts: account ? [account] : [],
          };
        }

        if (account && acc.accounts) {
          acc.accounts.push(account);
        }

        return acc;
      },
      null,
    );

    return plainToInstance(GetCustomerWithAccountsResponseDto, result);
  }

  async getSingleCustomer(customerId: string, user: CoreReqUser) {
    const customer = await this.customerRepo.findOne({
      where: and(
        eq(Customers.id, customerId),
        eq(Customers.tenantId, user.tenantId!),
        isNull(Customers.deletedAt),
      ),
      selectFn: (table) => ({
        id: table.id,
        emailAddress: table.emailAddress,
        firstName: table.firstName,
        lastName: table.lastName,
        businessName: table.businessName,
        dateOfBirth: table.dateOfBirth,
        dateOfIncorporation: table.dateOfIncorporation,
        status: table.status,
        type: table.type,
        createdAt: table.createdAt,
        street: table.street,
        state: table.state,
        city: table.city,
        country: table.country,
        createdBy: {
          id: Users.id,
          firstName: Users.firstName,
          lastName: Users.lastName,
          emailAddress: Users.emailAddress,
        },
      }),
      joinFn: (query) =>
        query.leftJoin(Users, eq(Customers.createdBy, Users.id)),
    });

    if (!customer)
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid customer',
        { error_code: 'GSC001' },
        HttpStatus.BAD_REQUEST,
      );

    const customerResp = {
      id: customer.id,
      emailAddress: customer.emailAddress,
      type: customer.type,
      ...(customer.type === CustomerType.Individual && {
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth
          ? moment(customer.dateOfBirth).format(DATE_FORMAT)
          : undefined,
      }),
      ...(customer.type === CustomerType.Corporate && {
        businessName: customer.businessName,
        dateOfIncorporation: customer.dateOfIncorporation
          ? moment(customer.dateOfIncorporation).format(DATE_FORMAT)
          : undefined,
      }),
      status: customer.status,
      street: customer.street,
      state: customer.state,
      city: customer.city,
      country: customer.country,
      createdAt: customer.createdAt,
      createdBy: customer.createdBy,
    };

    return plainToInstance(GetSingleCustomerResponseDto, customerResp);
  }
}
