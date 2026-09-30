import { Module } from '@nestjs/common';

import { CalculatorModule } from '@common';

import { AccountModule } from '../account/account.module';
import { TransactionModule } from '../transaction/transaction.module';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';

@Module({
  imports: [AccountModule, CalculatorModule, TransactionModule],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
