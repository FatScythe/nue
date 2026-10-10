import { Module } from '@nestjs/common';

import { CalculatorModule } from '@libs/common';
//libs...
import { DatabaseModule } from '@libs/database';
import { GLedgerModule } from '@libs/ledger';

import { AccountModule } from '../account/account.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [DatabaseModule, CalculatorModule, AccountModule, GLedgerModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
