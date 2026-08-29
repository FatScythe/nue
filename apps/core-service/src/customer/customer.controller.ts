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

// libs...
import { Resources } from '@database';
import { ParseUUID, type CoreReqUser } from '@common';

import {
  CreateCustomerDto,
  CreateCustomerRespDto,
  GetCustomersQueryDto,
  GetCustomerWithAccountsResponseDto,
  GetSingleCustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto';

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
    status: HttpStatus.OK,
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
    status: HttpStatus.OK,
    description: 'Customer with accounts retrieved successfully',
  })
  getCustomerWithAccounts(
    @Param('id', ParseUUID) customerId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<GetCustomerWithAccountsResponseDto> {
    return this.customerService.getCustomerWithAccounts(customerId, user);
  }

  @Permissions('customer:read')
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single customer by id' })
  @ApiSuccessResponseData(GetSingleCustomerResponseDto, {
    status: HttpStatus.OK,
    description: 'Customer retrieved successfully',
  })
  getSingleCustomer(
    @Param('id', ParseUUID) customerId: string,
    @GetUser() user: CoreReqUser,
  ): Promise<GetSingleCustomerResponseDto> {
    return this.customerService.getSingleCustomer(customerId, user);
  }
}
