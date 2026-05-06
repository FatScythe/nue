import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { DatabaseModule } from '@database';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [DatabaseModule, AccountModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
