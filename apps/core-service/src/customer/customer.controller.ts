import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

import { CustomerService } from './customer.service';
import { GetUser, Scopes } from '../common/decorator';

import { CreateCustomerDto, CreateCustomerRespDto } from './dto';

import { Resources } from '@database';
import type { CoreReqUser } from '@common';

@Scopes(Resources.Customer)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  createCustomer(
    @Body() dto: CreateCustomerDto,
    @GetUser() user: CoreReqUser,
  ): Promise<CreateCustomerRespDto> {
    return this.customerService.createCustomer(dto, user);
  }
}
