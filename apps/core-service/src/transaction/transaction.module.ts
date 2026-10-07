import { Module } from '@nestjs/common';

import { CalculatorModule } from '@common';
//libs...
import { DatabaseModule } from '@database';

import { AccountModule } from '../account/account.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [DatabaseModule, CalculatorModule, AccountModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
