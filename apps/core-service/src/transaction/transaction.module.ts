import { Module } from '@nestjs/common';

//libs...
import { CalculatorModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { GAccountModule, GLedgerModule } from '@libs/modules';

import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [DatabaseModule, CalculatorModule, GLedgerModule, GAccountModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
