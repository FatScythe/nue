import { Module } from '@nestjs/common';

//libs...
import { DatabaseModule } from '@database';
import { CalculatorModule } from '@common';

import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [DatabaseModule, AccountModule, CalculatorModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
