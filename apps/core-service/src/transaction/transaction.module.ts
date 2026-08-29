import { Module } from '@nestjs/common';

import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';

//libs...
import { DatabaseModule } from '@database';
import { CalculatorModule } from '@common';

@Module({
  imports: [DatabaseModule, CalculatorModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
