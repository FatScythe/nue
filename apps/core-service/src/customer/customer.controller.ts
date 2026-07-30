import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CustomerService } from './customer.service';
import {
  ApiSuccessResponseData,
  GetUser,
  Permissions,
  Scope,
} from '../common/decorator';

import { CreateCustomerDto, CreateCustomerRespDto } from './dto';

import { Resources } from '@database';
import type { CoreReqUser } from '@common';

@ApiTags('Customers')
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
}
