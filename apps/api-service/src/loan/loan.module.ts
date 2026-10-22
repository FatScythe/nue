import { Module } from '@nestjs/common';

// libs...
import { CalculatorModule } from '@libs/common';
import { GAccountModule } from '@libs/modules';

import { AccountModule } from '../account/account.module';
import { TransactionModule } from '../transaction/transaction.module';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';

@Module({
  imports: [AccountModule, CalculatorModule, TransactionModule, GAccountModule],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
