import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateCustomerDto, CreateCustomerRespDto } from './dto';
import { CustomerRepository } from '@database/repository';
import {
  AccountProducts,
  AccountProductStatus,
  AccountStatus,
  CustomerGender,
  CustomerStatus,
  CustomerType,
} from '@database/enums';
import moment from 'moment';
import { CoreReqUser } from '@lib/common/src/types';
import { AccountService } from '../account/account.service';
import { DATABASE_CONNECTION } from '@database/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@database/schemas';
import { and, eq } from 'drizzle-orm';
import { ApiException } from '../common/exception';
import { ApiErrorCode } from '../common/enums';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly customerRepo: CustomerRepository,
    private readonly accountService: AccountService,
  ) {}

  async createCustomer(
    dto: CreateCustomerDto,
    user: CoreReqUser,
  ): Promise<CreateCustomerRespDto> {
    const dbClient = this.db;

    const officeCheck = dbClient.query.offices.findFirst({
      where: and(
        eq(schema.offices.id, dto.officeId),
        eq(schema.offices.tenantId, user.tenantId!),
      ),
      columns: { id: true },
    });

    const productCheck = dto.createSavingsAccount
      ? dbClient.query.accountProducts.findFirst({
          where: and(
            eq(schema.accountProducts.id, dto.productId),
            eq(schema.accountProducts.tenantId, user.tenantId!),
          ),
          columns: { id: true, status: true },
        })
      : Promise.resolve(true);

    // we check if the office and/or acct product id belongs to the tenant...
    const [office, product] = await Promise.all([officeCheck, productCheck]);

    if (!office) {
      throw new ApiException(
        ApiErrorCode.BadRequest,
        'invalid office identifier',
        { error_code: 'CC0001' },
      );
    }

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

    const customerExist = await this.customerRepo.exists(
      and(
        eq(schema.customers.emailAddress, dto.emailAddress),
        eq(schema.customers.tenantId, user.tenantId!),
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
          id: '',
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

      console.log({ customer });

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

        // create account...
        const accountResult = await this.accountService.createAccountRecord(
          {
            customerId: customer.id,
            productId: dto.productId,
            accountName: effectiveAccountName,
            openingBalance: 0,
            officeId: dto.officeId,
            userId: user.id,
            productType: AccountProducts.Savings,
            tenantId: user.tenantId!,
            ...(dto.createdDate && {
              createdAt: moment(dto.createdDate).toDate(),
            }),
            ...(dto.activateCustomer && { status: AccountStatus.Active }),
          },
          tx, //  pass db transaction...
        );

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
}
