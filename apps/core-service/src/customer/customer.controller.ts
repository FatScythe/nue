import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { CustomerService } from './customer.service';
import {
  ApiSuccessResponseData,
  GetUser,
  Permissions,
  Scope,
} from '../common/decorator';

import {
  CreateCustomerDto,
  CreateCustomerRespDto,
  GetCustomersQueryDto,
  GetCustomerWithAccountsResponseDto,
  GetSingleCustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto';

import { Resources } from '@database';
import type { CoreReqUser } from '@common';

@ApiTags('Customers')
@ApiSecurity('bearer-token')
@Scope(Resources.Customer)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Permissions('customer:create')
  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new individual or corporate customer' })
  @ApiSuccessResponseData(CreateCustomerRespDto, {
    status: HttpStatus.CREATED,
    description: 'Customer created successfully',
  })
  createCustomer(
    @Body() dto: CreateCustomerDto,
    @GetUser() user: CoreReqUser,
  ): Promise<CreateCustomerRespDto> {
    return this.customerService.createCustomer(dto, user);
  }

  @Permissions('customer:read')
  @Get('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all customers with pagination and filters' })
  @ApiSuccessResponseData(PaginatedCustomersResponseDto, {
    description: 'Customers retrieved successfully',
  })
  getCustomers(
    @Query() dto: GetCustomersQueryDto,
    @GetUser() user: CoreReqUser,
  ): Promise<PaginatedCustomersResponseDto> {
    return this.customerService.getCustomers(dto, user);
  }

  @Permissions('customer:read')
  @Get('/:id/accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer with their accounts' })
  @ApiSuccessResponseData(GetCustomerWithAccountsResponseDto, {
    description: 'Customer with accounts retrieved successfully',
  })
  getCustomerWithAccounts(
    @Param('id') customerId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<GetCustomerWithAccountsResponseDto> {
    return this.customerService.getCustomerWithAccounts(customerId, user);
  }

  @Permissions('customer:read')
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single customer by id' })
  @ApiSuccessResponseData(GetSingleCustomerResponseDto, {
    description: 'Customer retrieved successfully',
  })
  getSingleCustomer(
    @Param('id') customerId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<GetSingleCustomerResponseDto> {
    return this.customerService.getSingleCustomer(customerId, user);
  }
}
