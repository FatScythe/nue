import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { DatabaseModule } from '@database';
import { AccountModule } from '../account/account.module';
import { CalculatorModule } from '@common/calculator';

@Module({
  imports: [DatabaseModule, AccountModule, CalculatorModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
