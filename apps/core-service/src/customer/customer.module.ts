import { Module } from '@nestjs/common';

import { CalculatorModule } from '@common';
//libs...
import { DatabaseModule } from '@database';

import { AccountModule } from '../account/account.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [DatabaseModule, AccountModule, CalculatorModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
