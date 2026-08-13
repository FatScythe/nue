import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { and, eq, ilike, isNull, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import moment from 'moment';

import * as schema from '@database/drizzle/schemas';
import { accounts, customers, offices, users } from '@database/drizzle/schemas';
import {
  // AccountProducts,
  // AccountProductStatus,
  AccountStatus,
  AccountType,
  CustomerGender,
  CustomerStatus,
  CustomerType,
  CustomerRepository,
} from '@database';
import { DATABASE_CONNECTION } from '@database/drizzle/drizzle.provider';
import {
  calculatePaginationMeta,
  Calculator,
  CoreReqUser,
  DATE_FORMAT,
} from '@common';

import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import {
  AccountResponseDto,
  CreateCustomerDto,
  CreateCustomerRespDto,
  GetCustomersQueryDto,
  GetCustomerWithAccountsResponseDto,
  GetSingleCustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto';
import { AccountService } from '../account/account.service';
import { CustomerWithAccountRow } from './interface';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly customerRepo: CustomerRepository,
    private readonly accountService: AccountService,
    private readonly calculator: Calculator,
  ) {}

  async createCustomer(
    dto: CreateCustomerDto,
    user: CoreReqUser,
  ): Promise<CreateCustomerRespDto> {
    const dbClient = this.db;

    const officeCheck = dbClient.query.offices.findFirst({
      where: and(
        eq(offices.id, dto.officeId),
        eq(offices.tenantId, user.tenantId!),
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
        eq(customers.emailAddress, dto.emailAddress),
        eq(customers.tenantId, user.tenantId!),
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

            accountName: effectiveAccountName,
            openingBalance: 0,
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

        await tx.insert(schema.savingsDetails).values({
          accountId: accountResult.accountId,
          tenantId: user.tenantId!,
          withdrawalCountThisMonth: 0,
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
        { error_code: 'CC0006' },
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
      eq(customers.tenantId, user.tenantId!),
      isNull(customers.deletedAt),
    ];

    if (dto.type) {
      conditions.push(eq(customers.type, dto.type));
    }

    if (dto.status) {
      conditions.push(eq(customers.status, dto.status));
    }

    if (dto.search) {
      const searchPattern = `%${dto.search}%`;
      conditions.push(
        or(
          ilike(customers.emailAddress, searchPattern),
          ilike(customers.firstName, searchPattern),
          ilike(customers.lastName, searchPattern),
          ilike(customers.businessName, searchPattern),
          ilike(customers.phoneNumber, searchPattern),
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
    const rows = await this.customerRepo.findAll<CustomerWithAccountRow>({
      where: and(
        eq(customers.id, customerId),
        eq(customers.tenantId, user.tenantId!),
        isNull(customers.deletedAt),
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
          id: accounts.id,
          accountNumber: accounts.accountNumber,
          accountName: accounts.accountName,
          status: accounts.status,
          type: accounts.type,
          bookBalance: accounts.bookBalance,
          balance: accounts.balance,
        },
      }),
      joinFn: (query) =>
        query.leftJoin(
          accounts,
          and(
            eq(customers.id, accounts.customerId),
            isNull(accounts.deletedAt),
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
        eq(customers.id, customerId),
        eq(customers.tenantId, user.tenantId!),
        isNull(customers.deletedAt),
      ),
      selectFn: (table) => ({
        id: table.id,
        emailAddress: table.emailAddress,
        firstName: table.firstName,
        lastName: table.lastName,
        businessName: table.businessName,
        dateOfBirth: table.dateOfBirth,
        dateOfIncorporation: table.dateOfIncorporation,
        status: table.status as unknown as CustomerStatus,
        type: table.type as unknown as CustomerType,
        createdAt: table.createdAt,
        street: table.street,
        state: table.state,
        city: table.city,
        country: table.country,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          emailAddress: users.emailAddress,
        },
      }),
      joinFn: (query) =>
        query.leftJoin(users, eq(customers.createdBy, users.id)),
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
