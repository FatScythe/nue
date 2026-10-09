import { Module } from '@nestjs/common';

import { CalculatorModule } from '@libs/common';
//libs...
import { DatabaseModule } from '@libs/database';

import { AccountModule } from '../account/account.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [DatabaseModule, AccountModule, CalculatorModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
