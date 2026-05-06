import { Body, Controller } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { GetUser, Scopes } from '../common/decorator';
import { Resources } from '@database/enums';
import { Post } from '@nestjs/common';
import { CreateCustomerDto, CreateCustomerRespDto } from './dto';
import type { CoreReqUser } from '@lib/common/src/types';
import { HttpCode } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';

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
